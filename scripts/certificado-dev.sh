#!/usr/bin/env bash
# HTTPS de desarrollo en la red local, para abrir app y app-admin desde el celular sin ngrok
# (la cámara del teléfono solo funciona en https).
#
#   bash scripts/certificado-dev.sh 192.168.1.88        # tu IP en la red (ipconfig)
#
# Deja en certs-dev/ (no va a git):
#   ca.crt / ca.key            CA de desarrollo. Se crea UNA vez; ca.crt se instala en cada celular.
#   servidor.crt / servidor.key certificado de localhost, 127.0.0.1 y las IP que pases. Si cambia tu IP,
#                              vuelve a correr el script: la CA se reutiliza y no hay que reinstalar nada.
# Validez del certificado del servidor: 800 días (iOS rechaza más de 825).
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash: que no convierta "/CN=…" en una ruta de Windows

[ $# -ge 1 ] || { echo "Uso: bash scripts/certificado-dev.sh <ip-de-tu-equipo> [otra-ip…]"; exit 1; }
DIR="$(cd "$(dirname "$0")/.." && pwd)/certs-dev"
mkdir -p "$DIR"; cd "$DIR"

if [ ! -f ca.key ]; then
  # configuración propia: la de OpenSSL por defecto ya agrega basicConstraints y quedaría duplicado (iOS lo rechaza)
  cat > ca.cnf <<'EOF'
[req]
distinguished_name = dn
x509_extensions = ca
prompt = no
[dn]
CN = MatchOnCard Desarrollo Local
O = MatchOnCard (solo desarrollo)
[ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
EOF
  openssl req -x509 -config ca.cnf -newkey rsa:2048 -sha256 -days 3650 -nodes -keyout ca.key -out ca.crt
  rm -f ca.cnf
  echo "CA nueva: $DIR/ca.crt (instálala en cada celular)"
fi

SAN="DNS:localhost,IP:127.0.0.1"
for ip in "$@"; do SAN="$SAN,IP:$ip"; done
cat > servidor.ext <<EOF
basicConstraints=CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid
subjectAltName=$SAN
EOF
openssl req -newkey rsa:2048 -sha256 -nodes -keyout servidor.key -out servidor.csr -subj "/CN=MatchOnCard dev"
openssl x509 -req -in servidor.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 800 -sha256 -extfile servidor.ext -out servidor.crt
rm -f servidor.csr servidor.ext
echo "Certificado del servidor para $SAN"
