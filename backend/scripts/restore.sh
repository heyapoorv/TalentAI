#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_folder_name>"
    exit 1
fi
mongorestore --uri="$MONGO_URL" /backups/$1
