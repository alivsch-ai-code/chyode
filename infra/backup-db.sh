#!/bin/bash
# Sichert die Datenbank per pg_dump (gzip). Läuft per Cron alle 30 Minuten (siehe infra/README.md).
# - schreibt erst in eine .tmp-Datei und benennt sie nur bei Erfolg um (keine halben Backups)
# - flock verhindert überlappende Läufe
# - Backups enthalten personenbezogene Daten: nur der Besitzer darf sie lesen
set -eo pipefail
umask 077

BACKUP_DIR="/home/claude/backups"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

exec 9>"$BACKUP_DIR/.lock"
flock -n 9 || { echo "$(date -Is) vorheriger Lauf aktiv, übersprungen"; exit 0; }

TARGET="$BACKUP_DIR/tripplanner_$(date +%Y%m%d_%H%M%S).sql.gz"
trap 'rm -f "$TARGET.tmp"' EXIT

docker exec chyode-db-1 pg_dump -U postgres tripplanner | gzip > "$TARGET.tmp"
mv "$TARGET.tmp" "$TARGET"

find "$BACKUP_DIR" -name 'tripplanner_*.sql.gz' -mtime +"$KEEP_DAYS" -delete
