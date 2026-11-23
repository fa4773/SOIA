#!/bin/bash
# ==============================================================================
# SOIA OS - Installer Guidato su Disco o Chiavetta USB
# ==============================================================================
set -e

clear
echo "========================================================================"
echo "                      SOIA OS - INSTALLAZIONE GUIDATA                  "
echo "========================================================================"
echo "Questo programma installerà SOIA su un disco interno (SSD/NVMe) o USB."
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "[ERRORE] Esegui questo script con privilegi root (sudo $0)."
  exit 1
fi

echo "[1/5] Rilevamento dischi di sistema..."
lsblk -d -p -n -l -o NAME,SIZE,MODEL,TRAN | grep -v "loop" || true
echo "------------------------------------------------------------------------"
read -p "Inserisci il percorso del disco di destinazione (es. /dev/sda o /dev/nvme0n1): " TARGET_DISK

if [ ! -b "$TARGET_DISK" ]; then
    echo "[ERRORE] Disco $TARGET_DISK non valido o inesistente!"
    exit 1
fi

echo ""
echo "ATTENZIONE: TUTTI I DATI SU $TARGET_DISK VERRANNO CANCELLATI IN MODO IRREVERSIBILE!"
read -p "Vuoi continuare? Digita 'CONFERMA': " CONFIRM_ACTION

if [ "$CONFIRM_ACTION" != "CONFERMA" ]; then
    echo "Operazione annullata dall'utente."
    exit 0
fi

echo ""
echo "[2/5] Partizionamento disco GPT ($TARGET_DISK)..."
wipefs -a "$TARGET_DISK"
parted -s "$TARGET_DISK" mklabel gpt
# Partizione 1: EFI System Partition (512MB)
parted -s "$TARGET_DISK" mkpart ESP fat32 1MiB 513MiB
parted -s "$TARGET_DISK" set 1 esp on
# Partizione 2: SOIA Root System (25GB)
parted -s "$TARGET_DISK" mkpart primary ext4 513MiB 26113MiB
# Partizione 3: SOIA Persistence / Dati Utente (spazio rimanente)
parted -s "$TARGET_DISK" mkpart primary ext4 26113MiB 100%

# Riconoscimento partizioni (sda1 o nvme0n1p1)
if [[ "$TARGET_DISK" =~ [0-9]$ ]]; then
    PART_EFI="${TARGET_DISK}p1"
    PART_ROOT="${TARGET_DISK}p2"
    PART_PERSIST="${TARGET_DISK}p3"
else
    PART_EFI="${TARGET_DISK}1"
    PART_ROOT="${TARGET_DISK}2"
    PART_PERSIST="${TARGET_DISK}3"
fi

echo "[3/5] Formattazione file system..."
mkfs.vfat -F32 -n "SOIA_EFI" "$PART_EFI"
mkfs.ext4 -F -L "SOIA_ROOT" "$PART_ROOT"
mkfs.ext4 -F -L "persistence" "$PART_PERSIST"

# Imposta persistence.conf
MOUNT_PERSIST="/mnt/tmp_persist"
mkdir -p "$MOUNT_PERSIST"
mount "$PART_PERSIST" "$MOUNT_PERSIST"
echo "/ union" > "$MOUNT_PERSIST/persistence.conf"
mkdir -p "$MOUNT_PERSIST/home/soia/progetti"
umount "$MOUNT_PERSIST"

echo "[4/5] Copia del sistema operativo SOIA..."
TARGET_MOUNT="/mnt/soia_install"
mkdir -p "$TARGET_MOUNT"
mount "$PART_ROOT" "$TARGET_MOUNT"
mkdir -p "$TARGET_MOUNT/boot/efi"
mount "$PART_EFI" "$TARGET_MOUNT/boot/efi"

# Sincronizzazione filesystem di base da squashfs live
rsync -aAXv --exclude={"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found"} / "$TARGET_MOUNT" 2>/dev/null || true

echo "[5/5] Installazione Bootloader GRUB UEFI..."
mount --bind /dev "$TARGET_MOUNT/dev"
mount --bind /proc "$TARGET_MOUNT/proc"
mount --bind /sys "$TARGET_MOUNT/sys"

chroot "$TARGET_MOUNT" grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=SOIA --recheck
chroot "$TARGET_MOUNT" update-grub

# Pulizia mount
umount "$TARGET_MOUNT/boot/efi"
umount "$TARGET_MOUNT/dev"
umount "$TARGET_MOUNT/proc"
umount "$TARGET_MOUNT/sys"
umount "$TARGET_MOUNT"

echo ""
echo "========================================================================"
echo "          INSTALLAZIONE DI SOIA COMPLETATA CON SUCCESSO!                "
echo "========================================================================"
echo "Ora puoi riavviare il sistema e rimuovere il supporto Live."
