#!/bin/bash
# ==============================================================================
# SOIA OS - Debian Live ISO Builder
# Generatore di immagine ISO Debian avviabile con Harness Agentico Electron
# ==============================================================================
set -e
export DEBIAN_FRONTEND=noninteractive

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="/tmp/soia_build_iso"
OUTPUT_ISO="$WORK_DIR/soia-os-latest-amd64.iso"

echo "========================================================================"
echo "               COSTRUZIONE IMMAGINE ISO SOIA LINUX (DEBIAN)            "
echo "========================================================================"

# Verifica privilegi
if [ "$EUID" -ne 0 ]; then
  echo "[ERRORE] Esegui lo script con permessi di root (sudo ./build-debian-iso.sh)."
  exit 1
fi

# Installa prerequisiti di compilazione live-build
echo "[1/6] Verifica dipendenze di build sull'host Debian..."
apt-get update -y
apt-get install -y live-build debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin dosfstools mtools rsync curl

# Pulizia build directory precedente
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

echo "[2/6] Configurazione ambiente live-build per Debian Bookworm..."
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

# Lista dei pacchetti da includere nel sistema
echo "[3/6] Definizione pacchetti di sistema SOIA..."
mkdir -p config/package-lists
cat << 'EOF' > config/package-lists/soia.list.chroot
# Kernel e Firmware Hardware
linux-image-amd64
firmware-linux
firmware-misc-nonfree
firmware-realtek
firmware-iwlwifi
wireless-regdb
pciutils
usbutils

# Compositor Wayland ultra-leggero e Display (cage kiosk + sway / xwayland)
cage
sway
xwayland
seatd
pipewire
wireplumber
alacritty

# Strumenti di rete e storage
network-manager
iproute2
parted
util-linux
e2fsprogs
dosfstools
btrfs-progs
cryptsetup

# Document Engine & Produttività (per generare .doc/.docx/.pdf al volo da AI)
pandoc
libreoffice-writer-nogui
poppler-utils

# Runtime Node.js ed Electron
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
EOF

# Personalizzazione Chroot: Utente live 'soia', autologin
echo "[4/6] Configurazione utente, sessione Wayland e permessi..."
mkdir -p config/includes.chroot/etc/systemd/system/getty@tty1.service.d
cat << 'EOF' > config/includes.chroot/etc/systemd/system/getty@tty1.service.d/autologin.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin soia --noclear %I $TERM
EOF

# Copia script di avvio, persistenza e installer in /usr/local/bin
mkdir -p config/includes.chroot/usr/local/bin
cp "$WORK_DIR/session/labwc-autostart" config/includes.chroot/usr/local/bin/soia-autostart
cp "$WORK_DIR/session/setup-persistence.sh" config/includes.chroot/usr/local/bin/
cp "$WORK_DIR/installer/soia-install.sh" config/includes.chroot/usr/local/bin/
chmod +x config/includes.chroot/usr/local/bin/soia-autostart
chmod +x config/includes.chroot/usr/local/bin/setup-persistence.sh
chmod +x config/includes.chroot/usr/local/bin/soia-install.sh

# Copia GRUB custom menu in includes.binary (senza sovrascrivere i template di sistema)
mkdir -p config/includes.binary/boot/grub
cp "$WORK_DIR/grub/grub.cfg" config/includes.binary/boot/grub/grub.cfg

# Hook per creare l'utente 'soia' con sudo senza password
mkdir -p config/hooks/live
cat << 'EOF' > config/hooks/live/01-create-soia-user.chroot
#!/bin/sh
set -e
if ! id -u soia >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo,audio,video,netdev soia
fi
for grp in seat _seatd plugdev render input; do
  getent group "$grp" >/dev/null 2>&1 && usermod -aG "$grp" soia || true
done
echo "soia:soia" | chpasswd
echo "soia ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/soia
chmod 0440 /etc/sudoers.d/soia
mkdir -p /home/soia
chown -R soia:soia /home/soia

# Imposta avvio della sessione SOIA all'accesso su tty1
cat << 'SH' >> /home/soia/.bash_profile
if [ -z "$WAYLAND_DISPLAY" ] && [ "$XDG_VTNR" = 1 ]; then
  if command -v labwc >/dev/null 2>&1; then
    exec labwc
  elif command -v cage >/dev/null 2>&1; then
    exec cage -- /usr/local/bin/soia-autostart
  else
    exec sway
  fi
fi
SH
chown soia:soia /home/soia/.bash_profile
EOF
chmod +x config/hooks/live/01-create-soia-user.chroot

# Bundle dell'applicazione SOIA dentro la cartella /opt/soia del live image
mkdir -p config/includes.chroot/opt/soia
if [ -d "$WORK_DIR/../dist" ] && [ -d "$WORK_DIR/../dist-electron" ]; then
    echo "[Info] Copia build SOIA compilata in /opt/soia..."
    cp -r "$WORK_DIR/../dist" config/includes.chroot/opt/soia/
    cp -r "$WORK_DIR/../dist-electron" config/includes.chroot/opt/soia/
    cp "$WORK_DIR/../package.json" config/includes.chroot/opt/soia/
    if [ -f "$WORK_DIR/../package-lock.json" ]; then
        cp "$WORK_DIR/../package-lock.json" config/includes.chroot/opt/soia/
    fi
fi

# Hook per installare le dipendenze di produzione ed Electron dentro chroot
cat << 'EOF' > config/hooks/live/02-install-soia-deps.chroot
#!/bin/sh
if [ -d /opt/soia ]; then
    cd /opt/soia
    npm install --omit=dev --no-audit --no-fund || true
    npm install electron --no-save --no-audit --no-fund || true
    chown -R soia:soia /opt/soia
fi
EOF
chmod +x config/hooks/live/02-install-soia-deps.chroot

echo "[5/6] Esecuzione live-build (debootstrap + creazione squashfs + ISO)..."
lb build

# Rilocazione dell'immagine creata
if [ -f live-image-amd64.hybrid.iso ]; then
    mv live-image-amd64.hybrid.iso "$OUTPUT_ISO"
elif [ -f live-image-amd64.iso ]; then
    mv live-image-amd64.iso "$OUTPUT_ISO"
fi

echo "[6/6] Build completata!"
echo "Immagine ISO generata con successo:"
echo "-> $OUTPUT_ISO"
