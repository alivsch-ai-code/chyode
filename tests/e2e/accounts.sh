#!/bin/bash
# E2E-Test der Konten-, Einladungs- und Reise-Flows gegen einen temporären Backend-Container (Port 4001).
API="http://localhost:4001/api"
CT="tp-e2e"
PASS=0; FAIL=0
J1=/tmp/e2e-admin.jar; J2=/tmp/e2e-user.jar
rm -f $J1 $J2

check() { # name expected actual
  if [ "$2" == "$3" ]; then echo "  OK   $1"; PASS=$((PASS+1)); else echo "  FAIL $1 (erwartet $2, war $3)"; FAIL=$((FAIL+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
tok() { sed -n 's#.*/\(register\|reset-password\)/\([^ ]*\)$#\2#p' | tail -1; }
json() { curl -s -H 'Content-Type: application/json' "$@"; }

echo "== Bootstrap Admin =="
LINK=$(docker exec $CT node dist/scripts/bootstrap-admin.js e2e-admin@example.test "E2E Admin" | grep -E '^https?://' | tail -1)
T=$(echo "$LINK" | tok)
check "Bootstrap liefert Einladungslink" "yes" "$([ -n "$T" ] && echo yes || echo no)"

echo "== Einladung annehmen =="
check "Einladung gueltig" 200 "$(code $API/auth/invite/$T)"
check "Schwaches Passwort abgelehnt" 400 "$(code -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$T\",\"name\":\"E2E Admin\",\"password\":\"kurz\"}" $API/auth/accept-invite)"
check "Konto anlegen" 201 "$(code -c $J1 -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$T\",\"name\":\"E2E Admin\",\"password\":\"AdminPasswort-123\"}" $API/auth/accept-invite)"
check "Einladung nur einmal nutzbar" 404 "$(code $API/auth/invite/$T)"
check "/auth/me mit Cookie" 200 "$(code -b $J1 $API/auth/me)"
check "Rolle ist admin" admin "$(curl -s -b $J1 $API/auth/me | jq -r .user.role)"
check "/auth/me ohne Cookie" 401 "$(code $API/auth/me)"

echo "== Login =="
check "Falsches Passwort" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"email":"e2e-admin@example.test","password":"falsch-falsch-1"}' $API/auth/login)"
check "Unbekannte E-Mail (gleiche Antwort)" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"email":"niemand@example.test","password":"falsch-falsch-1"}' $API/auth/login)"
check "Login korrekt" 200 "$(code -c $J1 -X POST -H 'Content-Type: application/json' -d '{"email":"E2E-Admin@Example.Test","password":"AdminPasswort-123"}' $API/auth/login)"

echo "== Admin: Einladen =="
INV=$(json -b $J1 -X POST -d '{"email":"e2e-user@example.test","name":"E2E Nutzer"}' $API/admin/invites)
check "Einladung erstellt" true "$(echo "$INV" | jq -r '.link != null')"
check "E-Mail-Versand aus -> emailSent=false" false "$(echo "$INV" | jq -r .emailSent)"
UT=$(echo "$INV" | jq -r .link | tok)
check "Doppelte Einladung an Admin-Adresse (existiert)" 409 "$(code -b $J1 -X POST -H 'Content-Type: application/json' -d '{"email":"e2e-admin@example.test"}' $API/admin/invites)"
check "Nutzer nimmt Einladung an" 201 "$(code -c $J2 -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$UT\",\"name\":\"E2E Nutzer\",\"password\":\"NutzerPasswort-123\"}" $API/auth/accept-invite)"
check "Nutzer darf /admin/users nicht" 403 "$(code -b $J2 $API/admin/users)"
check "Ohne Login /admin/users" 401 "$(code $API/admin/users)"
check "Admin sieht Nutzerliste" 200 "$(code -b $J1 $API/admin/users)"

echo "== Reise erstellen (als Nutzer) =="
TRIP=$(json -b $J2 -X POST -d '{"title":"E2E Reise","location":"Allgaeu","tripType":"hut","dateMode":"multiple_choice","nights":2,"dateOptions":[{"label":"W1","startDate":"2026-11-06","endDate":"2026-11-08"},{"label":"W2","startDate":"2026-11-13","endDate":"2026-11-15"}]}' $API/trips)
TID=$(echo "$TRIP" | jq -r .trip.id); IT=$(echo "$TRIP" | jq -r .trip.invite_token)
check "Reise angelegt" true "$([ "$TID" != null ] && echo true || echo false)"
check "Ungueltiges Datum abgelehnt" 400 "$(code -b $J2 -X POST -H 'Content-Type: application/json' -d '{"title":"X","location":"Y","dateOptions":[{"label":"a","startDate":"2026-11-08","endDate":"2026-11-06"}]}' $API/trips)"
check "Admin ist kein Mitglied -> 403" 403 "$(code -b $J1 $API/trips/$TID)"
check "Einladungsvorschau oeffentlich" 200 "$(code $API/trips/invite/$IT)"
check "Beitritt ohne Login" 401 "$(code -X POST $API/trips/invite/$IT/join)"
check "Admin tritt bei" 201 "$(code -b $J1 -X POST $API/trips/invite/$IT/join)"
check "Beitritt idempotent" 200 "$(code -b $J1 -X POST $API/trips/invite/$IT/join)"
check "Admin sieht jetzt Reise" 200 "$(code -b $J1 $API/trips/$TID)"
check "Meine Reisen (Admin)" 1 "$(curl -s -b $J1 $API/trips | jq '.trips | length')"

echo "== Termine, Voting, Notizen, Ergebnis =="
DO=$(curl -s -b $J1 $API/trips/$TID/date-options | jq -r '.dateOptions[0].id')
check "Terminoptionen (Datum als Klartext)" "2026-11-06" "$(curl -s -b $J1 $API/trips/$TID/date-options | jq -r '.dateOptions[0].start_date')"
check "Vote speichern" 201 "$(code -b $J1 -X POST -H 'Content-Type: application/json' -d "{\"dateOptionId\":\"$DO\",\"peopleCount\":2}" $API/trips/$TID/votes)"
check "Notiz speichern" 201 "$(code -b $J1 -X POST -H 'Content-Type: application/json' -d '{"category":"wish","content":"Sauna und Kamin bitte"}' $API/trips/$TID/notes)"
check "Ergebnis: Top-Termin (Ersteller)" "$DO" "$(curl -s -b $J2 $API/trips/$TID/results | jq -r '.results.topDateOption.dateOptionId')"
check "Teilnehmer darf Termine vorschlagen (201)" 201 "$(code -b $J1 -X POST -H 'Content-Type: application/json' -d '{"dateOptions":[{"label":"x","startDate":"2026-12-04","endDate":"2026-12-06"}]}' $API/trips/$TID/date-options)"
check "Termine hinzufuegen (Ersteller)" 201 "$(code -b $J2 -X POST -H 'Content-Type: application/json' -d '{"dateOptions":[{"label":"x","startDate":"2026-12-04","endDate":"2026-12-06"}]}' $API/trips/$TID/date-options)"
check "Unterkunftssuche nur Ersteller (Admin=403)" 403 "$(code -b $J1 -X POST -H 'Content-Type: application/json' -d '{}' $API/trips/$TID/accommodations/search)"
check "Unterkunftssuche (Ersteller) + demo-Flag" true "$(curl -s -b $J2 -X POST -H 'Content-Type: application/json' -d '{}' $API/trips/$TID/accommodations/search | jq -r '.demo')"
check "Voting schliessen (Ersteller)" closed "$(curl -s -b $J2 -X POST $API/trips/$TID/close-voting | jq -r .trip.status)"
check "Voting oeffnen (Ersteller)" voting "$(curl -s -b $J2 -X POST $API/trips/$TID/reopen-voting | jq -r .trip.status)"

echo "== Passwort vergessen / Reset =="
check "forgot-password neutral (bekannt)" 200 "$(code -X POST -H 'Content-Type: application/json' -d '{"email":"e2e-user@example.test"}' $API/auth/forgot-password)"
check "forgot-password neutral (unbekannt)" 200 "$(code -X POST -H 'Content-Type: application/json' -d '{"email":"niemand@example.test"}' $API/auth/forgot-password)"
RL=$(docker exec $CT node dist/scripts/bootstrap-admin.js e2e-admin@example.test | grep -E '^https?://' | tail -1)
RT=$(echo "$RL" | tok)
check "Reset-Link gueltig" 200 "$(code $API/auth/reset/$RT)"
check "Reset mit kurzem Passwort abgelehnt" 400 "$(code -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$RT\",\"password\":\"kurz\"}" $API/auth/reset-password)"
check "Reset erfolgreich" 200 "$(code -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$RT\",\"password\":\"NeuesPasswort-456\"}" $API/auth/reset-password)"
check "Reset-Link nur einmal nutzbar" 404 "$(code $API/auth/reset/$RT)"
check "Alte Sitzung nach Reset ungueltig" 401 "$(code -b $J1 $API/auth/me)"
check "Altes Passwort ungueltig" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"email":"e2e-admin@example.test","password":"AdminPasswort-123"}' $API/auth/login)"
check "Login mit neuem Passwort" 200 "$(code -c $J1 -X POST -H 'Content-Type: application/json' -d '{"email":"e2e-admin@example.test","password":"NeuesPasswort-456"}' $API/auth/login)"

echo "== Sperre, Deaktivierung, Logout =="
for i in 1 2 3 4 5; do code -X POST -H 'Content-Type: application/json' -d '{"email":"e2e-user@example.test","password":"falsch-falsch-1"}' $API/auth/login >/dev/null; done
check "Nach 5 Fehlversuchen gesperrt (429)" 429 "$(code -X POST -H 'Content-Type: application/json' -d '{"email":"e2e-user@example.test","password":"NutzerPasswort-123"}' $API/auth/login)"
UID2=$(curl -s -b $J1 $API/admin/users | jq -r '.users[] | select(.email=="e2e-user@example.test") | .id')
check "Admin darf sich nicht selbst degradieren" 403 "$(code -b $J1 -X PATCH -H 'Content-Type: application/json' -d "{\"role\":\"user\"}" $API/admin/users/$(curl -s -b $J1 $API/auth/me | jq -r .user.id))"
check "Nutzer deaktivieren" 200 "$(code -b $J1 -X PATCH -H 'Content-Type: application/json' -d '{"status":"disabled"}' $API/admin/users/$UID2)"
check "Deaktivierter Nutzer: Sitzung ungueltig" 401 "$(code -b $J2 $API/auth/me)"
check "Logout" 200 "$(code -b $J1 -c $J1 -X POST $API/auth/logout)"

echo
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[ $FAIL -eq 0 ]
