#!/bin/bash
# ==============================================================================
# SOIA OS - Guided Installer to Disk or USB Drive
# ==============================================================================
set -e

clear
echo "========================================================================"
echo "                        SOIA OS - GUIDED INSTALLER                     "
echo "========================================================================"
echo "This program will install SOIA to an internal drive (SSD/NVMe) or USB."
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Run this script with root privileges (sudo $0)."
  exit 1
fi

echo "[1/5] Detecting system disks..."
lsblk -d -p -n -l -o NAME,SIZE,MODEL,TRAN | grep -v "loop" || true
echo "------------------------------------------------------------------------"
read -p "Enter the target disk path (e.g. /dev/sda or /dev/nvme0n1): " TARGET_DISK

if [ ! -b "$TARGET_DISK" ]; then
    echo "[ERROR] Disk $TARGET_DISK is invalid or does not exist!"
    exit 1
fi

echo ""
echo "WARNING: ALL DATA ON $TARGET_DISK WILL BE IRREVERSIBLY ERASED!"
read -p "Do you want to continue? Type 'CONFIRM': " CONFIRM_ACTION

if [ "$CONFIRM_ACTION" != "CONFIRM" ]; then
    echo "Operation cancelled by user."
    exit 0
fi

echo ""
echo "[2/5] Partitioning GPT disk ($TARGET_DISK)..."
wipefs -a "$TARGET_DISK"
parted -s "$TARGET_DISK" mklabel gpt
# Partition 1: EFI System Partition (512MB)
parted -s "$TARGET_DISK" mkpart ESP fat32 1MiB 513MiB
parted -s "$TARGET_DISK" set 1 esp on
# Partition 2: SOIA Root System (25GB)
parted -s "$TARGET_DISK" mkpart primary ext4 513MiB 26113MiB
# Partition 3: SOIA Persistence / User Data (remaining space)
parted -s "$TARGET_DISK" mkpart primary ext4 26113MiB 100%

# Detect partition naming (sda1 or nvme0n1p1)
if [[ "$TARGET_DISK" =~ [0-9]$ ]]; then
    PART_EFI="${TARGET_DISK}p1"
    PART_ROOT="${TARGET_DISK}p2"
    PART_PERSIST="${TARGET_DISK}p3"
else
    PART_EFI="${TARGET_DISK}1"
    PART_ROOT="${TARGET_DISK}2"
    PART_PERSIST="${TARGET_DISK}3"
fi

echo "[3/5] Formatting filesystems..."
mkfs.vfat -F32 -n "SOIA_EFI" "$PART_EFI"
mkfs.ext4 -F -L "SOIA_ROOT" "$PART_ROOT"
mkfs.ext4 -F -L "persistence" "$PART_PERSIST"

# Configure persistence.conf
MOUNT_PERSIST="/mnt/tmp_persist"
mkdir -p "$MOUNT_PERSIST"
mount "$PART_PERSIST" "$MOUNT_PERSIST"
echo "/ union" > "$MOUNT_PERSIST/persistence.conf"
mkdir -p "$MOUNT_PERSIST/home/soia/progetti"
umount "$MOUNT_PERSIST"

echo "[4/5] Copying SOIA operating system..."
TARGET_MOUNT="/mnt/soia_install"
mkdir -p "$TARGET_MOUNT"
mount "$PART_ROOT" "$TARGET_MOUNT"
mkdir -p "$TARGET_MOUNT/boot/efi"
mount "$PART_EFI" "$TARGET_MOUNT/boot/efi"

# Sync base filesystem from live squashfs
rsync -aAXv --exclude={"/dev/*","/proc/*","/sys/*","/tmp/*","/run/*","/mnt/*","/media/*","/lost+found"} / "$TARGET_MOUNT" 2>/dev/null || true

echo "[5/5] Installing GRUB UEFI Bootloader..."
mount --bind /dev "$TARGET_MOUNT/dev"
mount --bind /proc "$TARGET_MOUNT/proc"
mount --bind /sys "$TARGET_MOUNT/sys"

chroot "$TARGET_MOUNT" grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=SOIA --recheck
chroot "$TARGET_MOUNT" update-grub

# Cleanup mounts
umount "$TARGET_MOUNT/boot/efi"
umount "$TARGET_MOUNT/dev"
umount "$TARGET_MOUNT/proc"
umount "$TARGET_MOUNT/sys"
umount "$TARGET_MOUNT"

echo ""
echo "========================================================================"
echo "            SOIA INSTALLATION COMPLETED SUCCESSFULLY!                   "
echo "========================================================================"
echo "You can now reboot the system and remove the Live media."
