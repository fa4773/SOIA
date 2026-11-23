#!/bin/bash
# ==============================================================================
# SOIA OS - Persistence Management Script (Live Persistence Manager)
# ==============================================================================
set -e

echo "[SOIA] Initializing Tails-style persistence module..."

# Check if booted with the persistence flag
if grep -q "persistence" /proc/cmdline; then
    echo "[SOIA] Persistence mode active in bootloader."
    
    # Search for partition labeled 'persistence'
    PERSIST_DEV=$(blkid -L persistence || true)
    
    if [ -n "$PERSIST_DEV" ]; then
        echo "[SOIA] Detected persistence partition: $PERSIST_DEV"
        MOUNT_POINT="/mnt/soia-persistence"
        mkdir -p "$MOUNT_POINT"
        mount "$PERSIST_DEV" "$MOUNT_POINT" 2>/dev/null || true
        
        if [ ! -f "$MOUNT_POINT/persistence.conf" ]; then
            echo "[SOIA] Automatically creating persistence.conf (/ union)..."
            echo "/ union" > "$MOUNT_POINT/persistence.conf"
        fi
        
        # Directory for SOIA persistent personal data
        mkdir -p "$MOUNT_POINT/home/soia/progetti"
        mkdir -p "$MOUNT_POINT/home/soia/.soia"
        chown -R 1000:1000 "$MOUNT_POINT/home/soia" 2>/dev/null || true
        
        umount "$MOUNT_POINT" 2>/dev/null || true
        echo "[SOIA] Persistence configured successfully."
    else
        echo "[SOIA] No partition labeled 'persistence' found. Session running in RAM."
    fi
else
    echo "[SOIA] Booting in volatile mode (pure RAM)."
fi
