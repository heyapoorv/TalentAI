#!/bin/bash
mongodump --uri="$MONGO_URL" --out=/backups/talentai_$(date +%Y%m%d%H%M%S)
