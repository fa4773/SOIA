#!/bin/bash
# ==============================================================================
# SOIA OS - Script Gestione Persistenza (Live Persistence Manager)
# ==============================================================================
set -e

echo "[SOIA] Inizializzazione modulo persistenza stile Tails..."

# Verifica se il boot è avvenuto con flag persistence
if grep -q "persistence" /proc/cmdline; then
    echo "[SOIA] Modalità persistenza attiva nel bootloader."
    
    # Ricerca partizione con etichetta 'persistence'
    PERSIST_DEV=$(blkid -L persistence || true)
    
    if [ -n "$PERSIST_DEV" ]; then
        echo "[SOIA] Rilevata partizione di persistenza: $PERSIST_DEV"
        MOUNT_POINT="/mnt/soia-persistence"
        mkdir -p "$MOUNT_POINT"
        mount "$PERSIST_DEV" "$MOUNT_POINT" 2>/dev/null || true
        
        if [ ! -f "$MOUNT_POINT/persistence.conf" ]; then
            echo "[SOIA] Creazione automatica di persistence.conf (/ union)..."
            echo "/ union" > "$MOUNT_POINT/persistence.conf"
        fi
        
        # Cartella per dati personali persistenti di SOIA
        mkdir -p "$MOUNT_POINT/home/soia/progetti"
        mkdir -p "$MOUNT_POINT/home/soia/.soia"
        chown -R 1000:1000 "$MOUNT_POINT/home/soia" 2>/dev/null || true
        
        umount "$MOUNT_POINT" 2>/dev/null || true
        echo "[SOIA] Persistenza configurata con successo."
    else
        echo "[SOIA] Nessuna partizione etichettata 'persistence' trovata. Sessione attiva in RAM."
    fi
else
    echo "[SOIA] Avvio in modalità volatile (RAM pura)."
fi
