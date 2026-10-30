import { Eyebrow, Wrap } from '@/components/layout/Wrap';
import { ButtonLink } from '@/components/ui/Button';

const K = ({ children }: { children: React.ReactNode }) => <span className="text-accent">{children}</span>;
const S = ({ children }: { children: React.ReactNode }) => <span className="text-ok">{children}</span>;
const C = ({ children }: { children: React.ReactNode }) => <span className="text-ink-3">{children}</span>;
const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-sm text-ink">{children}</code>
);

export function Integracion() {
  return (
    <section id="api" className="border-t border-line py-24 max-[560px]:py-[72px]">
      <Wrap className="grid grid-cols-[.9fr_1.1fr] items-center gap-12 max-[980px]:grid-cols-1">
        <div>
          <Eyebrow>Integración</Eyebrow>
          <h2 className="mb-4 mt-3.5 font-display text-[clamp(32px,4vw,46px)] font-semibold tracking-[-0.02em]">Una API para cualquier flujo de firma.</h2>
          <p className="text-[19px] text-ink-2">Tu plataforma crea la validación y envía el link al firmante. Cuando termina, recibes el resultado firmado en tu servidor.</p>
          <ul className="mt-[22px] grid list-none gap-2.5 p-0 text-ink-2">
            <li><Code>POST /v1/validaciones</Code>: crea la validación y entrega el link</li>
            <li><Code>GET /v1/validaciones/:id</Code>: estado, puntajes y hash de la evidencia</li>
            <li>Aviso por webhook firmado con HMAC</li>
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/integracion" variante="primary">Ver la documentación</ButtonLink>
            <ButtonLink href="/matchoncard.postman_collection.json" download>Colección Postman</ButtonLink>
          </div>
        </div>
        <pre className="m-0 overflow-x-auto rounded-[18px] border border-line bg-deep p-[22px] font-mono text-sm leading-[1.7] text-ink-2">
          <C>{'// 1 · crear la validación'}</C>{'\n'}
          <K>POST</K>{' /v1/validaciones\n{ '}<S>&quot;rut&quot;</S>{': '}<S>&quot;12.345.678-5&quot;</S>{', '}<S>&quot;documento_id&quot;</S>{': '}<S>&quot;DOC-123&quot;</S>{' }\n\n'}
          <C>{'// → link para el firmante'}</C>{'\n{ '}<S>&quot;url_captura&quot;</S>{': '}<S>&quot;https://api.matchoncard.cl/captura/…&quot;</S>{' }\n\n'}
          <C>{'// 2 · webhook al terminar'}</C>{'\n{ '}<S>&quot;estado&quot;</S>{': '}<S>&quot;aprobada&quot;</S>{',\n  '}
          <S>&quot;puntajes&quot;</S>{': { '}<S>&quot;huella&quot;</S>{': 0.99, '}<S>&quot;rostro&quot;</S>{': 0.93, '}<S>&quot;firma&quot;</S>{': 54 },\n  '}
          <S>&quot;evidencia_sha256&quot;</S>{': '}<S>&quot;9f2c…&quot;</S>{' }'}
        </pre>
      </Wrap>
    </section>
  );
}
