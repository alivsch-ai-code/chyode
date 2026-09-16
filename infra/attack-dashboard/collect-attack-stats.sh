#!/bin/bash
# Collects fail2ban/SSH attack stats into a JSON file for the public dashboard.
set -e

OUT_DIR="/home/claude/attack-dashboard"
OUT_FILE="$OUT_DIR/stats.json"
mkdir -p "$OUT_DIR"

STATUS=$(fail2ban-client status sshd 2>/dev/null || echo "")

CURRENTLY_BANNED=$(echo "$STATUS" | grep 'Banned IP list:' | sed 's/.*Banned IP list:[[:space:]]*//')
CURRENTLY_FAILED=$(echo "$STATUS" | grep 'Currently failed:' | grep -oE '[0-9]+' | head -1)
CURRENTLY_FAILED=${CURRENTLY_FAILED:-0}

# Total-Zähler bewusst NICHT aus "fail2ban-client status" (das ist nur der
# In-Memory-Stand seit dem letzten fail2ban-Neustart und würde bei jedem
# Server-Reboot auf 0 zurückfallen) — stattdessen aus der dauerhaften Logdatei,
# damit die Historie einen Neustart übersteht. Logrotate behält ältere Stände
# als fail2ban.log.1, fail2ban.log.2.gz etc., die hier mit einbezogen werden.
TOTAL_BANNED=0
TOTAL_FAILED=0
if ls /var/log/fail2ban.log* >/dev/null 2>&1; then
  TOTAL_BANNED=$(zgrep -ohE '\[sshd\] Ban ' /var/log/fail2ban.log* 2>/dev/null | wc -l) || true
  TOTAL_FAILED=$(zgrep -ohE '\[sshd\] Found ' /var/log/fail2ban.log* 2>/dev/null | wc -l) || true
  TOTAL_BANNED=${TOTAL_BANNED:-0}
  TOTAL_FAILED=${TOTAL_FAILED:-0}
fi

BANNED_JSON="[]"
if [ -n "$CURRENTLY_BANNED" ]; then
  BANNED_JSON=$(echo "$CURRENTLY_BANNED" | tr ' ' '\n' | grep -v '^$' | awk '{printf "\"%s\",", $0}' | sed 's/,$//')
  BANNED_JSON="[$BANNED_JSON]"
fi

# Failed-attempt count per day for the last 14 days (from fail2ban log "Found" lines,
# across current + rotated logs so a restart/log-rotation doesn't blank out history)
DAILY_JSON="[]"
if ls /var/log/fail2ban.log* >/dev/null 2>&1; then
  ENTRIES=""
  for i in $(seq 13 -1 0); do
    DAY=$(date -d "-$i day" +%Y-%m-%d)
    COUNT=$(zgrep -ohE "^$DAY.*fail2ban.filter.*\[sshd\] Found" /var/log/fail2ban.log* 2>/dev/null | wc -l) || true
    COUNT=${COUNT:-0}
    ENTRIES="$ENTRIES{\"date\":\"$DAY\",\"count\":$COUNT},"
  done
  DAILY_JSON="[${ENTRIES%,}]"
fi

# Top attacking IPs overall (from "Ban" lines across current + rotated fail2ban logs)
TOP_JSON="[]"
if ls /var/log/fail2ban.log* >/dev/null 2>&1; then
  TOP=$(zgrep -ohE '\[sshd\] Ban [0-9a-fA-F.:]+' /var/log/fail2ban.log* 2>/dev/null | awk '{print $3}' | sort | uniq -c | sort -rn | head -10)
  if [ -n "$TOP" ]; then
    TOP_JSON=$(echo "$TOP" | awk '{printf "{\"ip\":\"%s\",\"count\":%s},", $2, $1}' | sed 's/,$//')
    TOP_JSON="[$TOP_JSON]"
  fi
fi

GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

cat > "$OUT_FILE" <<EOF
{
  "generated_at": "$GENERATED_AT",
  "currently_banned": $BANNED_JSON,
  "total_banned": $TOTAL_BANNED,
  "currently_failed": $CURRENTLY_FAILED,
  "total_failed": $TOTAL_FAILED,
  "failed_by_day": $DAILY_JSON,
  "top_attacker_ips": $TOP_JSON
}
EOF

chmod 644 "$OUT_FILE"
