#!/bin/bash
# ==============================================================================
# SOIA OS - Debian Live ISO Builder
# Bootable Debian ISO image generator with Electron Agentic Harness
# ==============================================================================
set -e
export DEBIAN_FRONTEND=noninteractive

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="/tmp/soia_build_iso"
OUTPUT_ISO="$WORK_DIR/soia-os-latest-amd64.iso"

echo "========================================================================"
echo "                 BUILDING SOIA LINUX ISO IMAGE (DEBIAN)                "
echo "========================================================================"

# Check privileges
if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Run this script with root privileges (sudo ./build-debian-iso.sh)."
  exit 1
fi

# Install live-build compilation prerequisites
echo "[1/6] Checking build dependencies on Debian host..."
apt-get update -y
apt-get install -y live-build debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin dosfstools mtools rsync curl

# Clean previous build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

echo "[2/6] Configuring live-build environment for Debian Bookworm..."
lb config \
    --mode debian \
    --distribution bookworm \
    --architectures amd64 \
    --archive-areas "main contrib non-free non-free-firmware" \
    --mirror-bootstrap http://deb.debian.org/debian/ \
    --mirror-chroot http://deb.debian.org/debian/ \
    --mirror-binary http://deb.debian.org/debian/ \
    --parent-mirror-bootstrap http://deb.debian.org/debian/ \
    --parent-mirror-chroot http://deb.debian.org/debian/ \
    --parent-mirror-binary http://deb.debian.org/debian/ \
    --bootloaders "grub-pc grub-efi" \
    --binary-images iso-hybrid \
    --iso-application "SOIA Autonomous OS" \
    --iso-publisher "SOIA Open Source Project" \
    --iso-volume "SOIA_LIVE" \
    --memtest none \
    --win32-loader false

# List of packages to include in the system
echo "[3/6] Defining SOIA system packages..."
mkdir -p config/package-lists
cat << 'EOF' > config/package-lists/soia.list.chroot
# Kernel and Hardware Firmware
linux-image-amd64
firmware-linux
firmware-misc-nonfree
firmware-realtek
firmware-iwlwifi
wireless-regdb
pciutils
usbutils

# Ultra-lightweight Wayland Compositor and Display (cage kiosk + sway / xwayland)
cage
sway
xwayland
seatd
dbus-user-session
libgl1-mesa-dri
libegl1
libgles2
fonts-dejavu-core
pipewire
wireplumber
alacritty

# Network and storage tools
network-manager
iproute2
parted
util-linux
e2fsprogs
dosfstools
btrfs-progs
cryptsetup

# Document Engine & Productivity (for on-the-fly .doc/.docx/.pdf generation via AI)
pandoc
libreoffice-writer-nogui
poppler-utils

# Node.js and Electron Runtime
nodejs
npm
curl
wget
git
ca-certificates
libasound2
libnss3
libatk-bridge2.0-0
libgtk-3-0
libgbm1
libdrm2
libx11-xcb1
libxcb-dri3-0
libxss1
libxtst6
libxshmfence1
libxcomposite1
libxdamage1
libxrandr2
EOF

# Chroot customization: Live user 'soia', autologin (zz- prefix wins over live-config)
echo "[4/6] Configuring user, Wayland session, and permissions..."
mkdir -p config/includes.chroot/etc/systemd/system/getty@tty1.service.d
cat << 'EOF' > config/includes.chroot/etc/systemd/system/getty@tty1.service.d/zz-soia-autologin.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin soia --noclear %I $TERM
EOF

# Copy startup, persistence, and installer scripts to /usr/local/bin
mkdir -p config/includes.chroot/usr/local/bin
cp "$WORK_DIR/session/labwc-autostart" config/includes.chroot/usr/local/bin/soia-autostart
cp "$WORK_DIR/session/setup-persistence.sh" config/includes.chroot/usr/local/bin/
cp "$WORK_DIR/installer/soia-install.sh" config/includes.chroot/usr/local/bin/
# Strip Windows CRLF line endings defensively so scripts always run on Linux
sed -i 's/\r$//' \
  config/includes.chroot/usr/local/bin/soia-autostart \
  config/includes.chroot/usr/local/bin/setup-persistence.sh \
  config/includes.chroot/usr/local/bin/soia-install.sh
chmod +x config/includes.chroot/usr/local/bin/soia-autostart
chmod +x config/includes.chroot/usr/local/bin/setup-persistence.sh
chmod +x config/includes.chroot/usr/local/bin/soia-install.sh

# Copy custom GRUB menu into includes.binary (without overwriting system templates)
mkdir -p config/includes.binary/boot/grub
cp "$WORK_DIR/grub/grub.cfg" config/includes.binary/boot/grub/grub.cfg
sed -i 's/\r$//' config/includes.binary/boot/grub/grub.cfg

# Hook to create the 'soia' user with passwordless sudo
# NOTE: live-build on Debian Bookworm requires the .hook.chroot suffix!
mkdir -p config/hooks/live
cat << 'EOF' > config/hooks/live/01-create-soia-user.hook.chroot
#!/bin/sh
set -e
echo "[SOIA] Running 01-create-soia-user.hook.chroot..."
if ! id -u soia >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo,audio,video,netdev soia
fi
for grp in seat _seatd plugdev render input; do
  getent group "$grp" >/dev/null 2>&1 && usermod -aG "$grp" soia || true
done
echo "soia:soia" | chpasswd
echo "root:soia" | chpasswd
echo "soia ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/soia
chmod 0440 /etc/sudoers.d/soia
mkdir -p /home/soia
chown -R soia:soia /home/soia

# Configure SOIA session autostart on tty1 login (with Safe Graphics & shell fallback)
cat << 'SH' >> /home/soia/.bash_profile
if [ -z "$WAYLAND_DISPLAY" ] && [ "$XDG_VTNR" = "1" ]; then
  if [ -z "$XDG_RUNTIME_DIR" ]; then
    export XDG_RUNTIME_DIR="/tmp/soia-runtime-$(id -u)"
    mkdir -p "$XDG_RUNTIME_DIR"
    chmod 700 "$XDG_RUNTIME_DIR"
  fi
  if grep -q "nomodeset" /proc/cmdline 2>/dev/null; then
    export WLR_RENDERER=pixman
    export WLR_NO_HARDWARE_CURSORS=1
    export LIBGL_ALWAYS_SOFTWARE=1
  fi
  echo "[SOIA] Avvio sessione grafica Wayland..."
  if command -v cage >/dev/null 2>&1; then
    cage -s -- /usr/local/bin/soia-autostart 2>/tmp/soia-session.log || {
      echo "[SOIA] Errore durante l'avvio grafico con cage. Log: /tmp/soia-session.log"
      tail -n 20 /tmp/soia-session.log 2>/dev/null || true
      echo "[SOIA] Shell di emergenza attiva. Esegui 'cat /tmp/soia-session.log' per dettagli."
    }
  elif command -v sway >/dev/null 2>&1; then
    sway 2>/tmp/soia-session.log || true
  fi
fi
SH
chown soia:soia /home/soia/.bash_profile
EOF
chmod +x config/hooks/live/01-create-soia-user.hook.chroot

# Bundle the SOIA application inside /opt/soia of the live image
mkdir -p config/includes.chroot/opt/soia
if [ -d "$WORK_DIR/../dist" ] && [ -d "$WORK_DIR/../dist-electron" ]; then
    echo "[Info] Copying compiled SOIA build to /opt/soia..."
    cp -r "$WORK_DIR/../dist" config/includes.chroot/opt/soia/
    cp -r "$WORK_DIR/../dist-electron" config/includes.chroot/opt/soia/
    cp "$WORK_DIR/../package.json" config/includes.chroot/opt/soia/
    if [ -f "$WORK_DIR/../package-lock.json" ]; then
        cp "$WORK_DIR/../package-lock.json" config/includes.chroot/opt/soia/
    fi
fi

# Hook to install production dependencies and Electron inside chroot
cat << 'EOF' > config/hooks/live/02-install-soia-deps.hook.chroot
#!/bin/sh
set -e
echo "[SOIA] Running 02-install-soia-deps.hook.chroot..."
if [ -d /opt/soia ]; then
    cd /opt/soia
    npm install --omit=dev --no-audit --no-fund
    npm install electron --no-save --no-audit --no-fund
    chown -R soia:soia /opt/soia
    if [ -f /opt/soia/node_modules/electron/dist/chrome-sandbox ]; then
        chown root:root /opt/soia/node_modules/electron/dist/chrome-sandbox
        chmod 4755 /opt/soia/node_modules/electron/dist/chrome-sandbox
    fi
    ls -lh /opt/soia/node_modules/.bin/electron
fi
EOF
chmod +x config/hooks/live/02-install-soia-deps.hook.chroot

# Binary hook: ensure /live/vmlinuz and /live/initrd.img exist as regular files
# (required by GRUB and FAT32 USB extraction in Rufus ISO mode)
cat << 'EOF' > config/hooks/live/99-fix-live-kernel.hook.binary
#!/bin/sh
set -e
echo "[SOIA] Verifying kernel and initrd files in live/..."
if [ -d live ]; then
    VMLINUZ=$(ls live/vmlinuz-* 2>/dev/null | head -n 1 || true)
    INITRD=$(ls live/initrd.img-* 2>/dev/null | head -n 1 || true)
    if [ -n "$VMLINUZ" ] && [ ! -f live/vmlinuz ]; then
        cp -f "$VMLINUZ" live/vmlinuz
    fi
    if [ -n "$INITRD" ] && [ ! -f live/initrd.img ]; then
        cp -f "$INITRD" live/initrd.img
    fi
    ls -lh live/
fi
EOF
chmod +x config/hooks/live/99-fix-live-kernel.hook.binary

echo "[5/6] Running live-build (debootstrap + squashfs + ISO creation)..."
lb build

# Relocate the generated image
if [ -f live-image-amd64.hybrid.iso ]; then
    mv live-image-amd64.hybrid.iso "$OUTPUT_ISO"
elif [ -f live-image-amd64.iso ]; then
    mv live-image-amd64.iso "$OUTPUT_ISO"
fi

echo "[6/6] Build complete!"
echo "ISO image generated successfully:"
echo "-> $OUTPUT_ISO"
