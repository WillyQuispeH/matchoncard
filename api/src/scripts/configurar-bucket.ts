// Configura el bucket de evidencia en R2: CORS (solo PUT desde el dominio de captura) y ciclo de vida (red de seguridad de retención).
// Requiere un token de R2 con permiso "Admin Read & Write"; con uno de solo objetos, hazlo en el panel de Cloudflare.
// Uso: yarn bucket:configurar
import 'dotenv/config';
import { GetBucketCorsCommand, PutBucketCorsCommand, PutBucketLifecycleConfigurationCommand, S3Client } from '@aws-sdk/client-s3';

async function main() {
  const r2 = new S3Client({ endpoint: process.env.R2_ENDPOINT, region: 'auto',
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  const Bucket = process.env.R2_BUCKET!;
  const origen = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (!origen) throw new Error('Falta PUBLIC_URL');

  // Se suman orígenes, no se reemplazan: correrlo desde otro entorno no deja sin subida al que ya estaba.
  const actuales = await r2.send(new GetBucketCorsCommand({ Bucket }))
    .then((r) => r.CORSRules?.flatMap((x) => x.AllowedOrigins ?? []) ?? [])
    .catch((e) => { if (e?.name === 'NoSuchCORSConfiguration' || e?.$metadata?.httpStatusCode === 404) return [] as string[]; throw e; });
  const origenes = [...new Set([...actuales, origen])];
  await r2.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: [{ AllowedOrigins: origenes, AllowedMethods: ['PUT'], AllowedHeaders: ['content-type'], MaxAgeSeconds: 3600 }] } }));

  // La API borra a tiempo; esta regla solo atrapa lo que se haya escapado (retención máxima + 30 días).
  const dias = Number(process.env.RETENTION_DAYS_APPROVED || 1825) + 30;
  await r2.send(new PutBucketLifecycleConfigurationCommand({ Bucket, LifecycleConfiguration: { Rules: [
    { ID: 'retencion-maxima', Status: 'Enabled', Filter: { Prefix: 'evidencia/' }, Expiration: { Days: dias } },
    { ID: 'subidas-incompletas', Status: 'Enabled', Filter: { Prefix: 'evidencia/' }, AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 } },
  ] } }));
  console.log(`Bucket ${Bucket}: CORS para ${origenes.join(', ')} y expiración a ${dias} días configurados.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
