#!/bin/bash
# E2E-Test der Selbstregistrierung gegen temporaere Backend-Container (4001: an, 4002: Registrierung aus).
API="http://localhost:4001/api"; API2="http://localhost:4002/api"
CT="tp-e2e"; CT2="tp-e2e2"
PASS=0; FAIL=0
JA=/tmp/reg-a.jar; JB=/tmp/reg-b.jar; JC=/tmp/reg-c.jar; JD=/tmp/reg-d.jar
rm -f $JA $JB $JC $JD
PSQL="docker compose exec -T db psql -U postgres -d tripplanner -At"

check() { if [ "$2" == "$3" ]; then echo "  OK   $1"; PASS=$((PASS+1)); else echo "  FAIL $1 (erwartet $2, war $3)"; FAIL=$((FAIL+1)); fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
post() { local url=$1; shift; curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' "$url" "$@"; }
reg() { # email name password [next] [jar-args...]
  local body="{\"name\":\"$2\",\"email\":\"$1\",\"password\":\"$3\"${4:+,\"next\":\"$4\"}}"
  post $API/auth/register -d "$body"
}
last_token() { docker logs $CT 2>&1 | grep -o 'verify-email/[A-Za-z0-9_%.-]*' | tail -1 | sed 's#verify-email/##'; }

echo "== Konfiguration =="
check "Registrierung aktiv" true "$(curl -s $API/auth/config | jq -r .registrationEnabled)"

echo "== Validierung =="
check "Schwaches Passwort" 400 "$(reg e2e-reg1@example.test 'E2E Eins' kurz)"
check "Ungueltige E-Mail" 400 "$(reg keine-mail 'E2E Eins' 'LangesPasswort-1')"
check "Passwort = E-Mail" 400 "$(reg e2e-same-mail@example.test 'X' 'e2e-same-mail@example.test')"
check "Honeypot: neutrale Antwort" 200 "$(post $API/auth/register -d '{"name":"Bot","email":"e2e-bot@example.test","password":"LangesPasswort-1","website":"http://spam"}')"
check "Honeypot: keine Anfrage gespeichert" 0 "$($PSQL -c "select count(*) from email_verifications where email='e2e-bot@example.test'" 2>/dev/null)"

echo "== Registrieren und Bestaetigen =="
check "Registrierung angenommen" 200 "$(reg 'E2E-Reg1@Example.Test' 'E2E Eins' 'LangesPasswort-1' '/invite/abc123')"
check "Noch kein Konto vor Bestaetigung" 0 "$($PSQL -c "select count(*) from users where email='e2e-reg1@example.test'")"
check "Anfrage gespeichert (1)" 1 "$($PSQL -c "select count(*) from email_verifications where email='e2e-reg1@example.test' and used_at is null")"
check "Login vor Bestaetigung nicht moeglich" 401 "$(post $API/auth/login -d '{"email":"e2e-reg1@example.test","password":"LangesPasswort-1"}')"
sleep 1
T1=$(last_token)
check "Bestaetigungslink in der Mail" yes "$([ -n "$T1" ] && echo yes || echo no)"
check "Ungueltiger Token" 404 "$(post $API/auth/verify-email -d '{"token":"garbage-garbage-token"}')"
R=$(curl -s -c $JA -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$T1\"}" $API/auth/verify-email)
check "Bestaetigung legt Konto an + meldet an" user "$(echo "$R" | jq -r .user.role)"
check "Rueckspruungziel uebernommen" "/invite/abc123" "$(echo "$R" | jq -r .next)"
check "Name gespeichert" "E2E Eins" "$(echo "$R" | jq -r .user.name)"
check "Sitzung gueltig" 200 "$(code -b $JA $API/auth/me)"
check "Link nur einmal nutzbar" 404 "$(post $API/auth/verify-email -d "{\"token\":\"$T1\"}")"
check "Login mit kleingeschriebener Adresse" 200 "$(post $API/auth/login -d '{"email":"e2e-reg1@example.test","password":"LangesPasswort-1"}')"

echo "== Konto existiert bereits =="
check "Erneute Registrierung: neutrale Antwort" 200 "$(reg e2e-reg1@example.test 'Jemand' 'AnderesPasswort-9')"
sleep 1
check "Hinweismail 'bereits ein Konto'" 1 "$(docker logs $CT 2>&1 | grep -c 'Du hast bereits ein Konto')"
check "Es wurde keine neue Anfrage angelegt" 1 "$($PSQL -c "select count(*) from email_verifications where email='e2e-reg1@example.test'")"

echo "== Mail-Cooldown =="
reg e2e-reg2@example.test 'E2E Zwei' 'LangesPasswort-2' >/dev/null
reg e2e-reg2@example.test 'E2E Zwei' 'LangesPasswort-2' >/dev/null
check "Zweite Anfrage binnen 1 Min erzeugt keine zweite Mail/Zeile" 1 "$($PSQL -c "select count(*) from email_verifications where email='e2e-reg2@example.test'")"

echo "== Altkonto ohne Passwort (Magic-Link-Zeit) =="
$PSQL -c "insert into users (email,name) values ('e2e-legacy@example.test','Altkonto')" >/dev/null
LEGACY_ID=$($PSQL -c "select id from users where email='e2e-legacy@example.test'")
reg e2e-legacy@example.test 'Legacy Neu' 'LangesPasswort-3' >/dev/null
sleep 1; T3=$(last_token)
check "Altkonto wird ueber Bestaetigung freigeschaltet" 201 "$(code -c $JC -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$T3\"}" $API/auth/verify-email)"
check "Gleiche Konto-ID (keine Dublette)" "$LEGACY_ID" "$($PSQL -c "select id from users where email='e2e-legacy@example.test'")"
check "Login mit neuem Passwort" 200 "$(post $API/auth/login -d '{"email":"e2e-legacy@example.test","password":"LangesPasswort-3"}')"

echo "== Frueherer Gast wird zugeordnet =="
TRIP=$(curl -s -b $JA -X POST -H 'Content-Type: application/json' -d '{"title":"E2E Reise","location":"X","dateOptions":[{"label":"a","startDate":"2026-11-06","endDate":"2026-11-08"}]}' $API/trips)
TID=$(echo "$TRIP" | jq -r .trip.id)
$PSQL -c "insert into trip_users (trip_id,user_id,name,email,role,session_token) values ('$TID',null,'Gast','e2e-guest@example.test','participant','e2e-guest-token')" >/dev/null
reg e2e-guest@example.test 'Gast Neu' 'LangesPasswort-4' >/dev/null
sleep 1; T4=$(last_token)
check "Gast-Registrierung bestaetigt" 201 "$(code -c $JD -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$T4\"}" $API/auth/verify-email)"
check "Gast-Teilnahme dem Konto zugeordnet" 1 "$($PSQL -c "select count(*) from trip_users where trip_id='$TID' and email='e2e-guest@example.test' and user_id is not null")"
check "Ex-Gast sieht die Reise" 200 "$(code -b $JD $API/trips/$TID)"

echo "== Registrierung abgeschaltet =="
check "Config: aus" false "$(curl -s $API2/auth/config | jq -r .registrationEnabled)"
check "Registrieren -> 403" 403 "$(post $API2/auth/register -d '{"name":"X","email":"e2e-off@example.test","password":"LangesPasswort-5"}')"
check "Bestaetigen -> 403" 403 "$(post $API2/auth/verify-email -d '{"token":"irgendein-token-wert"}')"

echo
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[ $FAIL -eq 0 ]
