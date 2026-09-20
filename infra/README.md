# Infra (Referenz)

Diese Dateien spiegeln die Konfiguration, die manuell per SSH auf dem
Produktions-VPS (`voting.azamatsysteme.fun`, `82.165.176.201`) eingerichtet
wurde. Sie werden **nicht automatisch deployt** — bei Änderungen hier auch
manuell auf dem Server aktualisieren (und umgekehrt).

## nginx/
Reverse-Proxy-Configs, liegen auf dem Server unter `/etc/nginx/sites-available/`.
Die `ssl_certificate`-Zeilen (`# managed by Certbot`) werden von Certbot
automatisch verwaltet — bei einem frischen Server erst `certbot --nginx -d <domain>`
laufen lassen, dann entspricht die Datei wieder diesem Stand.

`rate-limit.conf` gehört nach `/etc/nginx/conf.d/` (definiert die `limit_req_zone`s,
die von den Site-Configs referenziert werden).

## attack-dashboard/
Statisches Angriffs-Dashboard unter `angriffe.azamatsysteme.fun`.
- `index.html` → `/home/claude/attack-dashboard/index.html`
- `collect-attack-stats.sh` → `/usr/local/bin/collect-attack-stats.sh`
  (läuft alle 5 Minuten als **root** via Cronjob, siehe `root-crontab.txt`,
  weil nur root `/var/log/fail2ban.log` lesen darf)
- `/home/claude` braucht `chmod o+x` (Traversierungsrecht), sonst kann nginx
  (läuft als `www-data`) die Dateien nicht ausliefern

## ssh/
- `troll_banner.txt` → `/etc/ssh/troll_banner.txt`
- `99-troll-banner.conf` → `/etc/ssh/sshd_config.d/99-troll-banner.conf`

Zeigt jedem SSH-Verbindungsversuch mit einem Usernamen außer `root`, `azamat`
oder `claude` eine Warnmeldung, bevor überhaupt ein Passwort abgefragt wird.
Echte Accounts sind davon nicht betroffen. Nutzernamen in der Match-Regel bei
Bedarf anpassen.

## Zusätzlich auf dem Server eingerichtet (kein Repo-Bezug)
- `ufw`: nur 22/80/443 offen, Default-Deny eingehend
- `fail2ban`: sshd-Jail, 5 Fehlversuche/10min → 1h Sperre
- `unattended-upgrades`: automatische Sicherheitsupdates
- DB-Backup alle 30 Minuten via Cronjob (`claude`-User, Skript `infra/backup-db.sh` → `/home/claude/backup-db.sh`, Crontab `*/30 * * * *`): `pg_dump` → `/home/claude/backups/` (nur für den Besitzer lesbar), 7 Tage Aufbewahrung
