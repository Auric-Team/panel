#!/bin/bash

# Navigate to panel directory
cd /root/panel || exit 1

# Configure git environment and credentials
export HOME="/root"
git config user.name "AXIOS Backup Bot" 2>/dev/null || true
git config user.email "backup@axioshacks.com" 2>/dev/null || true

TIMESTAMP=$(date -u +'%Y-%m-%d %H:%M:%S UTC')

# Stage ALL files including database, uploads/receipts, logs, and workspace code
git add -A . 2>/dev/null

# Check if there are any changes (staged or unstaged)
if [ -n "$(git status --porcelain)" ]; then
    echo "[$TIMESTAMP] Data changes detected. Performing automated git commit & push..." >> /root/panel/auto_backup.log
    
    git commit -m "chore(backup): automated database & data backup [$TIMESTAMP]" >> /root/panel/auto_backup.log 2>&1
    
    # Push to origin main
    git push origin main >> /root/panel/auto_backup.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "[$TIMESTAMP] SUCCESS: Data backup committed & pushed to GitHub." >> /root/panel/auto_backup.log
    else
        echo "[$TIMESTAMP] WARNING: Push failed, attempting pull --rebase..." >> /root/panel/auto_backup.log
        git pull --rebase origin main >> /root/panel/auto_backup.log 2>&1
        git push origin main >> /root/panel/auto_backup.log 2>&1
    fi
else
    echo "[$TIMESTAMP] No file/database changes in the last 5 minutes." >> /root/panel/auto_backup.log
fi
