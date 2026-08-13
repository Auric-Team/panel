#!/bin/bash

# Navigate to panel directory
cd /root/panel || exit 1

# Configure git user if needed
git config user.name "AXIOS Backup Bot" 2>/dev/null || true
git config user.email "backup@axioshacks.com" 2>/dev/null || true

# Force track database, logs, and upload receipts if modified/untracked
git add backend/data/axios.db backend/data/logs.json backend/uploads/ . 2>/dev/null

# Check if there are any staged changes
if ! git diff --cached --quiet; then
    TIMESTAMP=$(date -u +'%Y-%m-%d %H:%M:%S UTC')
    echo "[$TIMESTAMP] Changes detected. Creating automated backup..." >> /root/panel/auto_backup.log
    
    git commit -m "chore(backup): automated database & receipts backup [$TIMESTAMP]" >> /root/panel/auto_backup.log 2>&1
    
    git push origin main >> /root/panel/auto_backup.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "[$TIMESTAMP] Backup successfully pushed to GitHub." >> /root/panel/auto_backup.log
    else
        echo "[$TIMESTAMP] Error pushing backup to GitHub." >> /root/panel/auto_backup.log
    fi
else
    TIMESTAMP=$(date -u +'%Y-%m-%d %H:%M:%S UTC')
    echo "[$TIMESTAMP] No data changes detected. Skipping commit." >> /root/panel/auto_backup.log
fi
