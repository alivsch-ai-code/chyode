#!/bin/bash
# Integrationstest: Präferenzen, Ergebnis-Freigabe, Ergebnis-Mail, Terminvorschläge, Löschung.
# Ausführen im Projektverzeichnis auf dem Server (siehe tests/README.md). Nutzt einen temporären
# Backend-Container "tp-e2e" (Port 4001, Mailversand aus, NODE_ENV=development -> Mails im Log).
API="http://localhost:4001/api"; CT="tp-e2e"
PASS=0; FAIL=0
JC=/tmp/f-c.jar; J1=/tmp/f-p1.jar; J2=/tmp/f-p2.jar; J3=/tmp/f-p3.jar
rm -f $JC $J1 $J2 $J3
PSQL="docker compose exec -T db psql -U postgres -d tripplanner -At"

check() { if [ "$2" == "$3" ]; then echo "  OK   $1"; PASS=$((PASS+1)); else echo "  FAIL $1 (erwartet $2, war $3)"; FAIL=$((FAIL+1)); fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
jpost() { local jar=$1 url=$2 body=$3; shift 3; curl -s -b $jar -X POST -H 'Content-Type: application/json' -d "$body" "$url" "$@"; }
jcode() { local m=$1 jar=$2 url=$3 body=$4; curl -s -o /dev/null -w '%{http_code}' -b $jar -X $m -H 'Content-Type: application/json' ${body:+-d "$body"} "$url"; }
mail_count() { docker logs $CT 2>&1 | grep -c "(SMTP nicht konfiguriert) an .*: Das Ergebnis für"; }

register() { # email name jar
  curl -s -o /dev/null -X POST -H 'Content-Type: application/json' -d "{\"name\":\"$2\",\"email\":\"$1\",\"password\":\"Testpasswort-2026\"}" $API/auth/register
  sleep 1
  local t; t=$(docker logs $CT 2>&1 | grep -o 'verify-email/[A-Za-z0-9_%.-]*' | tail -1 | sed 's#verify-email/##')
  curl -s -o /dev/null -c $3 -X POST -H 'Content-Type: application/json' -d "{\"token\":\"$t\"}" $API/auth/verify-email
}

echo "== Nutzer registrieren =="
register e2e-c@example.test "E2E Ersteller" $JC
register e2e-p1@example.test "E2E Eins" $J1
register e2e-p2@example.test "E2E Zwei" $J2
register e2e-p3@example.test "E2E Drei" $J3
check "Ersteller angemeldet" 200 "$(code -b $JC $API/auth/me)"
check "Teilnehmer 1 angemeldet" 200 "$(code -b $J1 $API/auth/me)"
check "Teilnehmer 2 angemeldet" 200 "$(code -b $J2 $API/auth/me)"
check "Config nennt Löschfristen" 7 "$(curl -s $API/auth/config | jq -r .tripRetentionDays)"

echo "== Reise mit neuer Unterkunftsart =="
check "Ungültige Unterkunftsart abgelehnt" 400 "$(jcode POST $JC $API/trips '{"title":"X","location":"Y","tripType":"schloss","dateOptions":[{"label":"a","startDate":"2026-11-06","endDate":"2026-11-08"}]}')"
TRIP=$(jpost $JC $API/trips '{"title":"E2E Reise","location":"Allgaeu","tripType":"chalet","dateMode":"multiple_choice","nights":2,"dateOptions":[{"label":"W1","startDate":"2026-11-06","endDate":"2026-11-08"},{"label":"W2","startDate":"2026-11-13","endDate":"2026-11-15"}]}')
TID=$(echo "$TRIP" | jq -r .trip.id); IT=$(echo "$TRIP" | jq -r .trip.invite_token)
check "Reise vom Typ 'chalet' angelegt" chalet "$(echo "$TRIP" | jq -r .trip.trip_type)"
check "Teilnehmer 1 tritt bei" 201 "$(jcode POST $J1 $API/trips/invite/$IT/join)"
check "Teilnehmer 2 tritt bei" 201 "$(jcode POST $J2 $API/trips/invite/$IT/join)"
D1=$(curl -s -b $JC $API/trips/$TID/date-options | jq -r '.dateOptions[0].id')
check "Termin hat Vorschlagenden (Ersteller)" true "$(curl -s -b $J1 $API/trips/$TID/date-options | jq -r '.dateOptions[0].proposed_by_creator')"

echo "== Präferenzen =="
PREF() { echo "{\"budgetAccommodation\":$1,\"budgetActivities\":$2,\"experiences\":$3,\"accommodationTypes\":$4}"; }
check "Vorher keine Präferenzen" null "$(curl -s -b $J1 $API/trips/$TID/preferences/me | jq -r .preferences)"
check "Zu viele Erlebnisse (5) abgelehnt" 400 "$(jcode PUT $J1 $API/trips/$TID/preferences "$(PREF 200 100 '["nature","wellness","winter","culinary","adventure"]' '["hut"]')")"
check "Unbekanntes Erlebnis abgelehnt" 400 "$(jcode PUT $J1 $API/trips/$TID/preferences "$(PREF 200 100 '["ufo"]' '["hut"]')")"
check "Zu viele Unterkunftsarten (4) abgelehnt" 400 "$(jcode PUT $J1 $API/trips/$TID/preferences "$(PREF 200 100 '["nature"]' '["hut","chalet","hotel","wellness"]')")"
check "Negatives Budget abgelehnt" 400 "$(jcode PUT $J1 $API/trips/$TID/preferences "$(PREF -5 100 '["nature"]' '["hut"]')")"
check "Präferenzen speichern (Teilnehmer 1)" 200 "$(jcode PUT $J1 $API/trips/$TID/preferences "$(PREF 200 100 '["nature","wellness"]' '["hut","wellness"]')")"
check "Präferenzen speichern (Ersteller)" 200 "$(jcode PUT $JC $API/trips/$TID/preferences "$(PREF 100 50 '["wellness","calm"]' '["chalet"]')")"
check "Präferenzen speichern (Teilnehmer 2, ohne Budget-Aktivitäten)" 200 "$(jcode PUT $J2 $API/trips/$TID/preferences "$(PREF 300 null '["nature"]' '["hut"]')")"
check "Erneut speichern überschreibt (Upsert)" 200 "$(jcode PUT $J1 $API/trips/$TID/preferences "$(PREF 200 100 '["nature","wellness"]' '["hut","wellness"]')")"
check "Eigene Präferenzen lesbar" 200 "$(jcode GET $J1 $API/trips/$TID/preferences/me)"
check "Nur eine Zeile je Teilnehmer" 3 "$($PSQL -c "select count(*) from participant_preferences where trip_id='$TID'")"
check "Nicht-Mitglied darf nicht" 403 "$(jcode GET $J3 $API/trips/$TID/preferences/me)"

echo "== Sperre vor der Freigabe =="
check "Teilnehmer: Ergebnis gesperrt" 403 "$(jcode GET $J1 $API/trips/$TID/results)"
check "Teilnehmer: Stimmenliste gesperrt" 403 "$(jcode GET $J1 $API/trips/$TID/votes)"
check "Teilnehmer: Unterkünfte gesperrt" 403 "$(jcode GET $J1 $API/trips/$TID/accommodations)"
check "Ersteller: Ergebnis sichtbar" 200 "$(jcode GET $JC $API/trips/$TID/results)"
check "Detail: resultsReleased=false" false "$(curl -s -b $J1 $API/trips/$TID | jq -r .resultsReleased)"
check "Teilnehmer sieht keinen Fortschritt" null "$(curl -s -b $J1 $API/trips/$TID | jq -r .progress)"
check "Ersteller sieht Fortschritt (0 von 3)" "0/3" "$(curl -s -b $JC $API/trips/$TID | jq -r '"\(.progress.voted)/\(.progress.total)"')"
check "Teilnehmer darf nicht freigeben" 403 "$(jcode POST $J1 $API/trips/$TID/release-results)"

echo "== Notizen nur eigene vor Freigabe =="
jpost $J1 $API/trips/$TID/notes '{"category":"wish","content":"Sauna und Kamin bitte"}' >/dev/null
jpost $J2 $API/trips/$TID/notes '{"category":"idea","content":"Wanderung zur Alm"}' >/dev/null
check "Teilnehmer 1 sieht nur 1 Notiz" 1 "$(curl -s -b $J1 $API/trips/$TID/notes | jq '.notes | length')"
check "  onlyOwn-Flag gesetzt" true "$(curl -s -b $J1 $API/trips/$TID/notes | jq -r .onlyOwn)"
check "Ersteller sieht alle 2 Notizen" 2 "$(curl -s -b $JC $API/trips/$TID/notes | jq '.notes | length')"

echo "== Ergebnis-Statistik (Ersteller) =="
R=$(curl -s -b $JC $API/trips/$TID/results | jq .results)
check "Budget Übernachtung: Anzahl" 3 "$(echo "$R" | jq -r .budget.accommodation.count)"
check "Budget Übernachtung: Minimum" 100 "$(echo "$R" | jq -r .budget.accommodation.min)"
check "Budget Übernachtung: Maximum" 300 "$(echo "$R" | jq -r .budget.accommodation.max)"
check "Budget Übernachtung: Median" 200 "$(echo "$R" | jq -r .budget.accommodation.median)"
check "Budget Übernachtung: Durchschnitt" 200 "$(echo "$R" | jq -r .budget.accommodation.average)"
check "Budget Aktivitäten: nur 2 Angaben" 2 "$(echo "$R" | jq -r .budget.activities.count)"
check "Budget Aktivitäten: Median" 75 "$(echo "$R" | jq -r .budget.activities.median)"
check "Budget gesamt (nur Vollständige): 2 Angaben" 2 "$(echo "$R" | jq -r .budget.total.count)"
check "Budget gesamt: Minimum 150" 150 "$(echo "$R" | jq -r .budget.total.min)"
check "Erlebnis 'nature' hat 2 Stimmen" 2 "$(echo "$R" | jq -r '.experiences[] | select(.key=="nature") | .count')"
check "Erlebnis 'wellness' hat 2 Stimmen" 2 "$(echo "$R" | jq -r '.experiences[] | select(.key=="wellness") | .count')"
check "Unterkunftsart 'hut' hat 2 Stimmen" 2 "$(echo "$R" | jq -r '.accommodationTypes[] | select(.key=="hut") | .count')"
check "3 Teilnehmer gezählt (inkl. Ersteller)" 3 "$(echo "$R" | jq -r .totalParticipants)"
check "Kein Favorit ohne Stimmen" null "$(echo "$R" | jq -r .topDateOption)"

echo "== Terminvorschläge durch Teilnehmer =="
P=$(jpost $J1 $API/trips/$TID/date-options '{"dateOptions":[{"label":"Eigener","startDate":"2026-12-04","endDate":"2026-12-06"}]}')
PID=$(echo "$P" | jq -r '.dateOptions[0].id')
check "Teilnehmer schlägt Termin vor" true "$([ "$PID" != null ] && echo true || echo false)"
check "Vorschlagender wird angezeigt" "E2E Eins" "$(curl -s -b $J2 $API/trips/$TID/date-options | jq -r --arg id "$PID" '.dateOptions[] | select(.id==$id) | .proposed_by_name')"
check "Andere Teilnehmer dürfen ihn nicht löschen" 403 "$(jcode DELETE $J2 $API/trips/$TID/date-options/$PID)"
check "Fremden Termin des Erstellers nicht löschbar" 403 "$(jcode DELETE $J1 $API/trips/$TID/date-options/$D1)"
check "Duplikat wird übersprungen" 0 "$(jpost $J1 $API/trips/$TID/date-options '{"dateOptions":[{"label":"Eigener","startDate":"2026-12-04","endDate":"2026-12-06"}]}' | jq '.dateOptions | length')"
check "Vorschlagender löscht eigenen" 204 "$(jcode DELETE $J1 $API/trips/$TID/date-options/$PID)"
for i in 1 2 3 4 5; do jpost $J1 $API/trips/$TID/date-options "{\"dateOptions\":[{\"label\":\"E$i\",\"startDate\":\"2027-0$i-05\",\"endDate\":\"2027-0$i-07\"}]}" >/dev/null; done
check "Limit: 6. eigener Vorschlag abgelehnt" 400 "$(jcode POST $J1 $API/trips/$TID/date-options '{"dateOptions":[{"label":"E6","startDate":"2027-06-05","endDate":"2027-06-07"}]}')"
FIRST=$(curl -s -b $JC $API/trips/$TID/date-options | jq -r '[.dateOptions[] | select(.proposed_by_name=="E2E Eins")][0].id')
check "Ersteller löscht fremden Vorschlag" 204 "$(jcode DELETE $JC $API/trips/$TID/date-options/$FIRST)"

echo "== Abstimmen, Freigabe und Ergebnis-Mail =="
check "Ersteller stimmt ab" 201 "$(jcode POST $JC $API/trips/$TID/votes "{\"dateOptionId\":\"$D1\",\"peopleCount\":2}")"
check "Teilnehmer 1 stimmt ab" 201 "$(jcode POST $J1 $API/trips/$TID/votes "{\"dateOptionId\":\"$D1\",\"peopleCount\":1}")"
check "Ersteller gibt Ergebnis frei" 200 "$(jcode POST $JC $API/trips/$TID/release-results)"
sleep 2
check "Noch keine Mail (Teilnehmer 2 fehlt)" 0 "$(mail_count)"
check "Teilnehmer 1 sieht jetzt das Ergebnis" 200 "$(jcode GET $J1 $API/trips/$TID/results)"
check "Teilnehmer 1 sieht Stimmenliste" 200 "$(jcode GET $J1 $API/trips/$TID/votes)"
check "Nach Freigabe: alle Notizen sichtbar" 2 "$(curl -s -b $J1 $API/trips/$TID/notes | jq '.notes | length')"
check "Favorit steht fest" "$D1" "$(curl -s -b $J1 $API/trips/$TID/results | jq -r .results.topDateOption.dateOptionId)"
check "Teilnehmer 2 stimmt als Letzter ab" 201 "$(jcode POST $J2 $API/trips/$TID/votes "{\"dateOptionId\":\"$D1\",\"peopleCount\":1}")"
sleep 2
check "Ergebnis-Mail an alle 3 Mitglieder" 3 "$(mail_count)"
check "  Mail enthält den Wunsch 'Viel Spaß'" 1 "$(docker logs $CT 2>&1 | grep -c 'Viel Spaß beim gemeinsamen Feiern und Treffen' | awk '{print ($1>=3)?1:0}')"
check "  Mail-Link zeigt auf den Ergebnis-Tab" 1 "$(docker logs $CT 2>&1 | grep -c "trips/$TID?tab=results" | awk '{print ($1>=3)?1:0}')"
check "resultsNotified=true" true "$(curl -s -b $JC $API/trips/$TID | jq -r .resultsNotified)"
jcode POST $J2 $API/trips/$TID/votes "{\"dateOptionId\":\"$D1\",\"peopleCount\":3}" >/dev/null
jcode POST $JC $API/trips/$TID/hide-results >/dev/null
jcode POST $JC $API/trips/$TID/release-results >/dev/null
sleep 2
check "Kein zweiter Versand (weiter 3 Mails)" 3 "$(mail_count)"
check "Freigabe zurücknehmen sperrt wieder" 403 "$(jcode POST $JC $API/trips/$TID/hide-results >/dev/null; jcode GET $J1 $API/trips/$TID/results)"
jcode POST $JC $API/trips/$TID/release-results >/dev/null

echo "== Abstimmung beenden =="
check "Ersteller beendet die Abstimmung" closed "$(curl -s -b $JC -X POST $API/trips/$TID/close-voting | jq -r .trip.status)"
check "Löschfrist startet (voting_closed_at gesetzt)" 1 "$($PSQL -c "select count(*) from trips where id='$TID' and voting_closed_at is not null")"
check "Abstimmen nicht mehr möglich" 403 "$(jcode POST $J1 $API/trips/$TID/votes "{\"dateOptionId\":\"$D1\",\"peopleCount\":1}")"
check "Stimme zurückziehen nicht mehr möglich" 403 "$(jcode DELETE $J1 $API/trips/$TID/votes/$D1)"
check "Präferenzen nicht mehr änderbar" 403 "$(jcode PUT $J1 $API/trips/$TID/preferences "$(PREF 1 1 '[]' '[]')")"
check "Terminvorschlag nicht mehr möglich" 403 "$(jcode POST $J1 $API/trips/$TID/date-options '{"dateOptions":[{"label":"x","startDate":"2027-08-05","endDate":"2027-08-07"}]}')"
check "Nicht-Ersteller darf nicht löschen" 403 "$(jcode DELETE $J1 $API/trips/$TID)"

echo "== Automatische Löschung =="
STALE=$(jpost $J1 $API/trips '{"title":"Alt","location":"X","dateOptions":[{"label":"a","startDate":"2026-11-06","endDate":"2026-11-08"}]}' | jq -r .trip.id)
$PSQL -c "update trips set created_at = now() - interval '95 days' where id='$STALE'" >/dev/null
$PSQL -c "update trips set voting_closed_at = now() - interval '8 days' where id='$TID'" >/dev/null
R2=$(docker exec $CT node dist/scripts/run-retention.js | tail -1)
check "Beendete Reise (8 Tage) gelöscht" 1 "$(echo "$R2" | jq -r ".finishedTrips >= 1" | sed "s/true/1/")"
check "Nie beendete Reise (95 Tage) gelöscht" 1 "$(echo "$R2" | jq -r ".staleTrips >= 1" | sed "s/true/1/")"
check "Reise + Präferenzen + Stimmen weg" 0 "$($PSQL -c "select (select count(*) from trips where id in ('$TID','$STALE')) + (select count(*) from participant_preferences where trip_id='$TID') + (select count(*) from votes where trip_id='$TID')")"

echo "== Konto und Reise selbst löschen =="
T2=$(jpost $J2 $API/trips '{"title":"Zwei","location":"X","dateOptions":[{"label":"a","startDate":"2026-11-06","endDate":"2026-11-08"}]}' | jq -r .trip.id)
IT2=$(curl -s -b $J2 $API/trips/$T2 | jq -r .trip.invite_token)
jcode POST $J1 $API/trips/invite/$IT2/join >/dev/null
check "Ersteller löscht Reise sofort" 204 "$(jcode DELETE $J2 $API/trips/$T2)"
check "  Teilnehmer verliert Zugriff" 403 "$(jcode GET $J1 $API/trips/$T2)"
T3=$(jpost $J2 $API/trips '{"title":"Drei","location":"X","dateOptions":[{"label":"a","startDate":"2026-11-06","endDate":"2026-11-08"}]}' | jq -r .trip.id)
check "Konto löschen: falsches Passwort" 403 "$(jcode DELETE $J2 $API/auth/me '{"password":"falsch-falsch-1"}')"
check "Konto löschen: ohne Passwort" 400 "$(jcode DELETE $J2 $API/auth/me '{}')"
check "Konto löschen: korrekt" 204 "$(jcode DELETE $J2 $API/auth/me '{"password":"Testpasswort-2026"}')"
check "  Sitzung danach ungültig" 401 "$(jcode GET $J2 $API/auth/me)"
check "  Konto, eigene Reise und Teilnahmen restlos weg" 0 "$($PSQL -c "select (select count(*) from users where email='e2e-p2@example.test') + (select count(*) from trips where id='$T3') + (select count(*) from trip_users where email='e2e-p2@example.test')")"

echo "== Aufräumen =="
$PSQL -c "delete from email_verifications where email like 'e2e-%@example.test'; delete from users where email like 'e2e-%@example.test';" >/dev/null
rm -f $JC $J1 $J2 $J3

echo
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[ $FAIL -eq 0 ]
