#!/usr/bin/env bash
# ==============================================================================
# SOIA OS - Test ISO su GitHub Codespaces (QEMU + noVNC)
# Uso:
#   bash linux-iso/test-codespace.sh <URL_ISO_O_TAG_RELEASE> [--uefi]
# Esempi:
#   bash linux-iso/test-codespace.sh "https://github.com/fa4773/SOIA/releases/download/v1.0.0/soia-os-latest-amd64.iso"
#   bash linux-iso/test-codespace.sh v1.0.0          # scarica via gh CLI (utile per repo private)
#   bash linux-iso/test-codespace.sh v1.0.0 --uefi   # avvia in modalità UEFI (OVMF)
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <URL_ISO | TAG_RELEASE> [--uefi]"
  exit 1
fi

TARGET="$1"
USE_UEFI=false
if [ "${2:-}" = "--uefi" ]; then
  USE_UEFI=true
fi

ISO_FILE="/tmp/soia-test.iso"

echo "=== [1/4] Download della ISO ==="
if [[ "$TARGET" =~ ^https?:// ]]; then
  wget -O "$ISO_FILE" "$TARGET"
else
  if ! command -v gh >/dev/null 2>&1; then
    echo "[ERRORE] Hai passato un tag ('$TARGET') ma 'gh' CLI non è installata. Passa l'URL diretto."
    exit 1
  fi
  rm -f "$ISO_FILE"
  gh release download "$TARGET" -p "*.iso" -O "$ISO_FILE"
fi

echo "=== [2/4] Verifica file scaricato ==="
ls -lh "$ISO_FILE"
FILE_SIZE_BYTES=$(stat -c%s "$ISO_FILE" 2>/dev/null || wc -c < "$ISO_FILE")
if [ "$FILE_SIZE_BYTES" -lt 52428800 ]; then
  echo "[ERRORE] Il file è più piccolo di 50 MB ($FILE_SIZE_BYTES byte)."
  echo "Probabilmente hai scaricato una pagina HTML di errore/login (repo privata?) invece della ISO."
  exit 1
fi

echo "=== [3/4] Installazione QEMU, noVNC e websockify ==="
PKGS=(qemu-system-x86 novnc websockify)
if [ "$USE_UEFI" = true ]; then
  PKGS+=(ovmf)
fi
sudo apt-get update -y
sudo apt-get install -y "${PKGS[@]}"

# Termina eventuali sessioni precedenti sulla stessa porta/VNC
pkill -f "qemu-system-x86_64.*-vnc :0" 2>/dev/null || true
pkill -f "websockify.*6080" 2>/dev/null || true
sleep 1

echo "=== [4/4] Avvio QEMU + noVNC ==="
QEMU_ARGS=(
  -cdrom "$ISO_FILE"
  -m 4096
  -smp 2
  -vga virtio
  -vnc :0
)

if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
  echo "[INFO] KVM disponibile: attivo accelerazione hardware."
  QEMU_ARGS+=(-enable-kvm)
else
  echo "[INFO] KVM non disponibile nel Codespace: emulazione software (il boot richiederà qualche minuto)."
fi

if [ "$USE_UEFI" = true ]; then
  if [ -f /usr/share/ovmf/OVMF.fd ]; then
    QEMU_ARGS+=(-bios /usr/share/ovmf/OVMF.fd)
  else
    echo "[ERRORE] /usr/share/ovmf/OVMF.fd non trovato."
    exit 1
  fi
fi

qemu-system-x86_64 "${QEMU_ARGS[@]}" >/tmp/qemu-soia.log 2>&1 &
QEMU_PID=$!

websockify --web=/usr/share/novnc 6080 localhost:5900 >/tmp/websockify-soia.log 2>&1 &
WS_PID=$!

sleep 2
if ! kill -0 "$QEMU_PID" 2>/dev/null; then
  echo "[ERRORE] QEMU si è chiuso subito. Log:"
  cat /tmp/qemu-soia.log
  exit 1
fi

echo ""
echo "========================================================================"
echo "  SOIA OS in esecuzione su QEMU (PID $QEMU_PID) + noVNC (PID $WS_PID)"
echo "========================================================================"
echo "1. Apri la scheda 'Ports' in basso (accanto a Terminal)."
echo "2. Individua la porta 6080 e clicca sull'icona del globo (Open in Browser)."
echo "3. Nella pagina aperta clicca su 'vnc.html' -> 'Connect'."
echo ""
echo "Suggerimento: se la grafica Wayland (cage) dovesse restare nera,"
echo "riavvia e scegli nel menu GRUB: 'Avvia SOIA Live (Safe Graphics / NVIDIA)'."
echo "Per fermare tutto: pkill -f qemu-system-x86_64; pkill -f websockify"
echo "========================================================================"
