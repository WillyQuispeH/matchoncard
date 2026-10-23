"""
Crea la autoridad certificadora propia de MatchOnCard y el certificado con que el servicio firma los PDF.
Uso (en el servidor):  FIRMA_P12_CLAVE=... python crear_certificado.py <carpeta> [carpeta_respaldo_clave_CA]
Genera:  firma-ca.pem (certificado público de la CA, para verificar)  ·  firma.p12 (clave privada + certificado, protegido con clave)
         firma-ca.key.p12 (clave de la CA, protegida; guárdala fuera del servidor y bórrala de ahí)
"""
import os
import sys
from datetime import datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

destino = sys.argv[1] if len(sys.argv) > 1 else '.'
respaldo = sys.argv[2] if len(sys.argv) > 2 else destino   # la clave de la CA va aparte: se descarga y se borra del servidor
clave = os.environ.get('FIRMA_P12_CLAVE', '').encode()
if len(clave) < 16:
    sys.exit('Define FIRMA_P12_CLAVE (mínimo 16 caracteres)')
for f in ('firma.p12', 'firma-ca.pem'):
    if os.path.exists(os.path.join(destino, f)):
        sys.exit(f'{f} ya existe en {destino}; no se sobrescribe')

ahora = datetime.now(timezone.utc)
nombre = lambda cn: x509.Name([
    x509.NameAttribute(NameOID.COUNTRY_NAME, 'CL'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'MatchOnCard'),
    x509.NameAttribute(NameOID.COMMON_NAME, cn),
])

ca_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
ca_name = nombre('MatchOnCard CA Raíz')
ca = (x509.CertificateBuilder().subject_name(ca_name).issuer_name(ca_name).public_key(ca_key.public_key())
      .serial_number(x509.random_serial_number()).not_valid_before(ahora - timedelta(minutes=5)).not_valid_after(ahora + timedelta(days=365 * 15))
      .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
      .add_extension(x509.KeyUsage(digital_signature=False, content_commitment=False, key_encipherment=False, data_encipherment=False,
                                   key_agreement=False, key_cert_sign=True, crl_sign=True, encipher_only=False, decipher_only=False), critical=True)
      .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
      .sign(ca_key, hashes.SHA256()))

key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
cert = (x509.CertificateBuilder().subject_name(nombre('MatchOnCard Firma Electrónica Simple')).issuer_name(ca_name).public_key(key.public_key())
        .serial_number(x509.random_serial_number()).not_valid_before(ahora - timedelta(minutes=5)).not_valid_after(ahora + timedelta(days=365 * 3))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.KeyUsage(digital_signature=True, content_commitment=True, key_encipherment=False, data_encipherment=False,
                                     key_agreement=False, key_cert_sign=False, crl_sign=False, encipher_only=False, decipher_only=False), critical=True)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.EMAIL_PROTECTION, x509.ObjectIdentifier('1.3.6.1.4.1.311.10.3.12')]), critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .sign(ca_key, hashes.SHA256()))

enc = serialization.BestAvailableEncryption(clave)
os.makedirs(destino, exist_ok=True)
with open(os.path.join(destino, 'firma.p12'), 'wb') as f:
    f.write(pkcs12.serialize_key_and_certificates(b'matchoncard-firma', key, cert, [ca], enc))
with open(os.path.join(destino, 'firma-ca.pem'), 'wb') as f:
    f.write(ca.public_bytes(serialization.Encoding.PEM))
os.makedirs(respaldo, exist_ok=True)
with open(os.path.join(respaldo, 'firma-ca.key.p12'), 'wb') as f:
    f.write(pkcs12.serialize_key_and_certificates(b'matchoncard-ca', ca_key, ca, None, enc))
os.chmod(os.path.join(destino, 'firma.p12'), 0o640)
os.chmod(os.path.join(respaldo, 'firma-ca.key.p12'), 0o600)
os.chmod(os.path.join(destino, 'firma-ca.pem'), 0o644)
print(f'Listo: {destino}/firma.p12 (vence {cert.not_valid_after_utc:%Y-%m-%d}), {destino}/firma-ca.pem, {respaldo}/firma-ca.key.p12')
