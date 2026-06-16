# TalentAI Backup & Recovery Strategy

## Backups
- Run the backup script daily via cron:
  ```bash
  0 2 * * * /path/to/talentai/backend/scripts/backup.sh
  ```
- Store backups in a secure external storage service (e.g., AWS S3).
- Test backups monthly.

## Recovery
- If the database fails, spin up a fresh instance.
- Ensure the `$MONGO_URL` points to the new instance.
- Run the restore script:
  ```bash
  ./backend/scripts/restore.sh <backup_folder_name>
  ```
- Once the restore is complete, restart the backend containers to re-establish connections.
