#!/usr/bin/env bash
# Crea (una sola vez) la CA de MatchOnCard y el certificado con que se firman los PDF.
# Uso, en el servidor, desde la carpeta del proyecto:  bash deploy/crear-firma.sh
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -s firma/firma.p12 ]; then echo "Ya existe firma/firma.p12: no se crea de nuevo."; exit 0; fi
mkdir -p firma firma-ca-respaldo
# clave aleatoria del .p12: la usa solo el contenedor api-signature (no hace falta que la sepas ni la escribas)
ENV_FIRMA=api-signature/.env.production
(umask 077; touch "$ENV_FIRMA")
if ! grep -qE '^FIRMA_P12_CLAVE=.{16,}' "$ENV_FIRMA"; then
  CLAVE=$(openssl rand -base64 36 | tr -d '\n/+=' | cut -c1-40)
  if grep -q '^FIRMA_P12_CLAVE=' "$ENV_FIRMA"; then
    sed -i "s|^FIRMA_P12_CLAVE=.*|FIRMA_P12_CLAVE=$CLAVE|" "$ENV_FIRMA"
  else
    echo "FIRMA_P12_CLAVE=$CLAVE" >> "$ENV_FIRMA"
  fi
  unset CLAVE
fi
docker compose build api-signature
docker compose run --rm --no-deps --user root \
  -v "$PWD/firma:/salida" -v "$PWD/firma-ca-respaldo:/respaldo" --entrypoint sh api-signature \
  -c 'python crear_certificado.py /salida /respaldo'
chown -R 10001:10001 firma && chmod 750 firma
chmod 600 "$ENV_FIRMA" firma-ca-respaldo/firma-ca.key.p12
echo
echo "Listo. Ahora, DESDE TU COMPUTADOR, descarga el respaldo de la CA y la clave del certificado:"
echo "  scp root@$(hostname -I | awk '{print $1}'):$PWD/firma-ca-respaldo/firma-ca.key.p12 ~/Documents/"
echo "  scp root@$(hostname -I | awk '{print $1}'):$PWD/$ENV_FIRMA ~/Documents/matchoncard-firma.env"
echo "Guárdalos en un lugar seguro (no en el escritorio) y luego, en el servidor, borra la clave de la CA:"
echo "  rm -rf $PWD/firma-ca-respaldo"
