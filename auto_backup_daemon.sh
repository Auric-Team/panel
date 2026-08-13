#!/bin/bash

echo "Starting AXIOS Automated 5-Minute Backup Daemon..."
while true; do
    /root/panel/auto_backup.sh
    sleep 300
done
