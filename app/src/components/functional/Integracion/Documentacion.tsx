import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Codigo, type Muestra } from './Codigo';
import { type GrupoIndice, Indice } from './Indice';
import * as E from './ejemplos';

// ───────── piezas de la página ─────────

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[0.86em] text-ink">{children}</code>
);

const COLOR_METODO: Record<string, string> = {
  GET: 'border-menta/30 bg-menta/10 text-menta', POST: 'border-lila/30 bg-lila/10 text-lila', DELETE: 'border-rosa/30 bg-rosa/10 text-rosa',
};

function Metodo({ m }: { m: string }) {
  return <span className={`rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${COLOR_METODO[m]}`}>{m}</span>;
}

function Nota({ tono = 'info', children }: { tono?: 'info' | 'warn'; children: ReactNode }) {
  const t = tono === 'warn' ? 'border-mostaza/30 bg-mostaza/10' : 'border-lila/30 bg-lila/10';
  return <div className={`my-5 rounded-xl border px-4 py-3 text-[15px] text-ink ${t}`}>{children}</div>;
}

interface Param { nombre: string; tipo: string; req?: boolean; desc: ReactNode }

function Parametros({ titulo = 'Parámetros del cuerpo', filas }: { titulo?: string; filas: Param[] }) {
  return (
    <div className="mt-6">
      <h4 className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-3">{titulo}</h4>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface px-4">
        {filas.map((p) => (
          <div key={p.nombre} className="grid gap-1 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-sm text-ink">{p.nombre}</span>
              <span className="font-mono text-xs text-ink-3">{p.tipo}</span>
              {p.req ? <span className="font-mono text-[11px] text-warn">requerido</span> : <span className="font-mono text-[11px] text-ink-3">opcional</span>}
            </div>
            <div className="text-[15px] text-ink-2">{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sección a dos columnas: explicación a la izquierda y código fijo a la derecha (como Stripe)
function Bloque({ id, eyebrow, titulo, children, codigo }: { id: string; eyebrow?: ReactNode; titulo: ReactNode; children: ReactNode; codigo?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-14 first:border-t-0 first:pt-0">
      <div className={codigo ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 max-[1180px]:grid-cols-1' : 'max-w-[760px]'}>
        <div className="min-w-0">
          {eyebrow && <div className="mb-3">{eyebrow}</div>}
          <h2 className="mb-4 text-[clamp(26px,3vw,32px)] tracking-[-0.01em]">{titulo}</h2>
          <div className="text-[16px] leading-[1.7] text-ink-2 [&_p]:mb-4 [&_strong]:text-ink">{children}</div>
        </div>
        {codigo && <div className="grid min-w-0 content-start gap-4 min-[1181px]:sticky min-[1181px]:top-24 min-[1181px]:self-start">{codigo}</div>}
      </div>
    </section>
  );
}

function Endpoint({ id, metodo, ruta, titulo, rol, children, codigo }: {
  id: string; metodo: string; ruta: string; titulo: string; rol: string; children: ReactNode; codigo: Muestra[][];
}) {
  return (
    <Bloque id={id} titulo={titulo}
      eyebrow={<div className="flex flex-wrap items-center gap-2.5"><Metodo m={metodo} /><code className="break-all font-mono text-sm text-ink">{ruta}</code><span className="font-mono text-xs text-ink-3">rol {rol}</span></div>}
      codigo={codigo.map((m, i) => <Codigo key={i} muestras={m} />)}>
      {children}
    </Bloque>
  );
}

function Tabla({ cabeza, filas }: { cabeza: string[]; filas: ReactNode[][] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-left text-[15px]">
        <thead className="bg-sunken text-ink">
          <tr>{cabeza.map((c) => <th key={c} className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-ink-3">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line text-ink-2">
          {filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j} className="px-4 py-2.5 align-top">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

// ───────── índice ─────────

const INDICE: GrupoIndice[] = [
  {
    titulo: 'Empezar', items: [
      { id: 'introduccion', texto: 'Introducción' }, { id: 'inicio-rapido', texto: 'Inicio rápido' },
      { id: 'autenticacion', texto: 'Autenticación' }, { id: 'postman', texto: 'Colección Postman' },
    ]
  },
  {
    titulo: 'Validaciones', items: [
      { id: 'crear-validacion', texto: 'Crear validación', metodo: 'POST' }, { id: 'obtener-validacion', texto: 'Consultar validación', metodo: 'GET' },
      { id: 'evidencia', texto: 'Descargar evidencia', metodo: 'GET' }, { id: 'borrar-validacion', texto: 'Suprimir validación', metodo: 'DELETE' },
      { id: 'titular', texto: 'Validaciones de un RUT', metodo: 'GET' },
    ]
  },
  {
    titulo: 'Documentos', items: [
      { id: 'crear-documento', texto: 'Registrar documento', metodo: 'POST' }, { id: 'listar-documentos', texto: 'Listar documentos', metodo: 'GET' },
      { id: 'obtener-documento', texto: 'Consultar documento', metodo: 'GET' }, { id: 'descargar-pdf', texto: 'Descargar PDF', metodo: 'GET' },
      { id: 'reenviar-enlace', texto: 'Nuevo link de firmante', metodo: 'POST' }, { id: 'cancelar-documento', texto: 'Cancelar documento', metodo: 'POST' },
      { id: 'suprimir-documento', texto: 'Suprimir documento', metodo: 'DELETE' }, { id: 'verificar', texto: 'Verificar un PDF', metodo: 'POST' },
    ]
  },
  {
    titulo: 'Referencia', items: [
      { id: 'webhooks', texto: 'Webhooks' }, { id: 'estados', texto: 'Estados y motivos' },
      { id: 'errores', texto: 'Errores' }, { id: 'limites', texto: 'Límites' },
    ]
  },
];

const PASOS = [
  ['Pide tus credenciales', 'Te entregamos un id de cliente, un secreto para firmar los JWT y un secreto para verificar los webhooks.'],
  ['Crea la validación', 'POST /v1/validaciones con el RUT de la persona. Recibes un url_captura.'],
  ['Envía el link', 'Por email, SMS, WhatsApp o un botón en tu web. La persona lo abre en su teléfono y se valida en 2 minutos.'],
  ['Recibe el resultado', 'Te avisamos por webhook firmado: aprobada, revision o rechazada.'],
];

const FLUJO: [string, string, ReactNode][] = [
  ['Tu servidor', 'MatchOnCard', <>POST /v1/validaciones con el RUT → recibes <C>url_captura</C></>],
  ['Tu servidor', 'Firmante', 'Le envías el link por el canal que prefieras'],
  ['Firmante', 'MatchOnCard', 'Captura cédula, huella, rostro y firma desde su teléfono'],
  ['MatchOnCard', 'Tu servidor', <>Webhook <C>validacion.finalizada</C> con el estado final</>],
];

// ───────── página ─────────

export function Documentacion() {
  return (
    <div className="text-[17px] leading-[1.6]">
      <SiteHeader />

      {/* portada */}
      <div className="border-b border-line">
        <div className="mx-auto max-w-[1360px] px-6 pb-16 pt-16 max-[560px]:px-4 max-[560px]:pt-10">
          <p className="max-w-[62ch] text-[19px] text-ink-2">
            Una API REST para validar a una persona contra su cédula (huella, rostro y firma) y para firmar PDF con esa validación. Tú creas la validación y envías el link; nosotros hacemos la captura y te avisamos el resultado.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="#inicio-rapido" variante="durazno" tamano="lg">Empezar</ButtonLink>
            <ButtonLink href={E.POSTMAN} download tamano="lg">Descargar colección Postman</ButtonLink>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[13px] text-ink-3">
            <span>URL base <span className="text-ink">{E.BASE_URL}</span></span>
            <span>Formato <span className="text-ink">JSON · UTF-8</span></span>
            <span>Auth <span className="text-ink">JWT HS256</span></span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1360px] grid-cols-[230px_minmax(0,1fr)] gap-12 px-6 max-[980px]:grid-cols-1 max-[980px]:gap-0 max-[560px]:px-4">
        <aside className="sticky top-[68px] h-[calc(100vh-68px)] overflow-y-auto py-10 max-[980px]:hidden">
          <Indice grupos={INDICE} />
        </aside>

        <details className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 min-[981px]:hidden">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.08em] text-ink-2">Contenido</summary>
          <div className="mt-4"><Indice grupos={INDICE} /></div>
        </details>

        <main className="min-w-0 py-12">
          {/* ───── Empezar ───── */}
          <Bloque id="introduccion" titulo="Introducción">
            <p>MatchOnCard compara la <strong>huella</strong>, el <strong>rostro</strong> y la <strong>firma</strong> de una persona con su cédula de identidad chilena, desde su propio teléfono y sin instalar nada. Para tu sistema es una caja negra con dos piezas:</p>
            <ul className="mb-4 grid list-disc gap-1.5 pl-5">
              <li><strong>Validaciones</strong>: confirmar que quien está al otro lado es el titular del RUT.</li>
              <li><strong>Documentos</strong>: sellar un PDF, pedir la validación a cada firmante y estampar su firma electrónica (PAdES) cuando se valida.</li>
            </ul>
            <p>No necesitas manejar cámaras, fotos ni biometría. La captura, el cifrado de la evidencia y su conservación son nuestros.</p>
            <ol className="my-6 grid list-none gap-2 rounded-xl border border-line bg-surface p-4 text-[15px] shadow-[0_2px_0_var(--color-line)]">
              {FLUJO.map(([de, a, que], i) => (
                <li key={i} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 rounded-lg px-2 py-2 max-[560px]:grid-cols-1">
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded-md border border-line-2 bg-sunken px-2 py-1 text-ink">{de}</span>
                    <span className="text-accent">→</span>
                    <span className="rounded-md border border-line-2 bg-sunken px-2 py-1 text-ink">{a}</span>
                  </span>
                  <span className="text-ink-2">{que}</span>
                </li>
              ))}
            </ol>
          </Bloque>

          <Bloque id="inicio-rapido" titulo="Inicio rápido" codigo={<><Codigo muestras={E.crearValidacion} /><Codigo muestras={E.respuestaCrearValidacion} /></>}>
            <ol className="m-0 grid list-none gap-4 p-0">
              {PASOS.map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[36px_1fr] gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-line-2 bg-surface font-mono text-sm text-accent">{i + 1}</span>
                  <div><strong className="text-ink">{t}</strong><div className="text-[15px]">{d}</div></div>
                </li>
              ))}
            </ol>
            <Nota>Para pedir credenciales escribe a <a href="mailto:jgomez@portalfirma.cl" className="text-accent">jgomez@portalfirma.cl</a> con el nombre de tu empresa, la URL de tu webhook y los roles que necesitas.</Nota>
          </Bloque>

          <Bloque id="autenticacion" titulo="Autenticación" codigo={<Codigo titulo="Generar las cabeceras" muestras={E.autenticacion} />}>
            <p>Cada solicitud a <C>/v1</C> lleva dos cabeceras:</p>
            <Tabla cabeza={['Cabecera', 'Valor']} filas={[
              [<C key="a">id</C>, 'El id de tu cliente, ej. mi-empresa'],
              [<C key="b">Authorization</C>, <span key="c"><C>Bearer &lt;JWT&gt;</C> firmado con tu secreto</span>],
            ]} />
            <p>El JWT se firma con <strong>HS256</strong> y tu <C>secreto_jwt</C>. Debe tener <C>iss</C> igual a tu id de cliente y una vida corta: <C>exp − iat</C> de <strong>300 segundos como máximo</strong>. Genera uno nuevo por solicitud; no lo guardes ni lo reutilices.</p>
            <Nota tono="warn">El secreto vive solo en tu servidor. Nunca llames a la API desde el navegador o una app móvil: cualquiera podría extraerlo.</Nota>
            <h3 className="mb-2 mt-8 text-xl">Roles</h3>
            <p>Cada cliente tiene uno o más roles que limitan lo que puede hacer:</p>
            <Tabla cabeza={['Rol', 'Para qué']} filas={[
              [<C key="1">integracion</C>, 'Crear y consultar validaciones y documentos. Es el que necesita casi todo integrador.'],
              [<C key="2">auditor</C>, 'Descargar la evidencia de una validación (cada descarga queda auditada con su motivo).'],
              [<C key="3">dpo</C>, 'Ley de datos personales: derecho de acceso por RUT y supresión de validaciones y documentos.'],
            ]} />
          </Bloque>

          <Bloque id="postman" titulo="Colección Postman"
            codigo={<Codigo titulo="Variables de la colección" muestras={[{ lenguaje: 'variables', codigo: `base_url        ${E.BASE_URL}\ncliente_id      mi-empresa\nsecreto_jwt     ••••••••••••\nvalidacion_id   (se llena sola al crear)\ndocumento_id    (se llena sola al crear)\nfirmante_id     (se llena sola al crear)` }]} />}>
            <p>La colección trae todos los endpoints listos para probar. Un script previo genera el JWT en cada solicitud, así que solo tienes que completar tus credenciales.</p>
            <ol className="mb-5 grid list-decimal gap-1.5 pl-5">
              <li>Descarga el archivo y en Postman elige <strong>Import</strong>.</li>
              <li>Abre la colección → pestaña <strong>Variables</strong> y completa <C>cliente_id</C> y <C>secreto_jwt</C>.</li>
              <li>Ejecuta <strong>Crear validación</strong>: el <C>validacion_id</C> queda guardado para las siguientes solicitudes.</li>
            </ol>
            <ButtonLink href={E.POSTMAN} download variante="primary">Descargar matchoncard.postman_collection.json</ButtonLink>
          </Bloque>

          {/* ───── Validaciones ───── */}
          <Endpoint id="crear-validacion" metodo="POST" ruta="/v1/validaciones" titulo="Crear una validación" rol="integracion"
            codigo={[E.crearValidacion, E.respuestaCrearValidacion]}>
            <p>Crea la validación y devuelve el link que debes entregar al firmante. El link vale <strong>24 horas</strong>; una vez abierto, la persona tiene <strong>40 minutos</strong> para terminar.</p>
            <Parametros filas={[
              { nombre: 'rut', tipo: 'string', req: true, desc: <>RUT del titular, con o sin puntos y guion (<C>12.345.678-5</C> o <C>123456785</C>). Se valida el dígito verificador y se compara con el RUN que se lee de la cédula.</> },
              { nombre: 'nombre', tipo: 'string ≤ 160', desc: 'Nombre del titular. Se muestra en la página de captura.' },
              { nombre: 'referencia', tipo: 'string ≤ 120', desc: 'Tu identificador interno (operación, contrato, cliente). Vuelve en el webhook.' },
              { nombre: 'documento_id', tipo: 'string ≤ 80', desc: 'Identificador de tu documento, si la validación es para firmarlo en tu sistema.' },
              { nombre: 'callback_url', tipo: 'url https ≤ 500', desc: <>Dónde te avisamos el resultado. Debe ser <C>https</C> con dominio público. Ver <a href="#webhooks" className="text-accent">Webhooks</a>.</> },
            ]} />
            <Parametros titulo="Respuesta" filas={[
              { nombre: 'validacion_id', tipo: 'uuid', req: true, desc: 'Guárdalo junto a tu operación.' },
              { nombre: 'url_captura', tipo: 'url', req: true, desc: 'Link único para el firmante. No lo guardamos: si lo pierdes, crea otra validación.' },
              { nombre: 'expira_en', tipo: 'ISO 8601', req: true, desc: 'Hasta cuándo se puede abrir el link.' },
            ]} />
          </Endpoint>

          <Endpoint id="obtener-validacion" metodo="GET" ruta="/v1/validaciones/:id" titulo="Consultar una validación" rol="integracion · auditor · dpo"
            codigo={[E.obtenerValidacion, E.respuestaValidacion]}>
            <p>Devuelve el estado actual, los puntajes por factor y el hash de la evidencia. Úsalo como respaldo del webhook o para mostrar el avance en tu sistema.</p>
            <Parametros titulo="Campos principales" filas={[
              { nombre: 'estado', tipo: 'string', req: true, desc: <>Ver <a href="#estados" className="text-accent">Estados</a>.</> },
              { nombre: 'motivos', tipo: 'string[]', req: true, desc: 'Por qué la validación no quedó aprobada (vacío si salió todo bien).' },
              { nombre: 'puntajes', tipo: 'object | null', req: true, desc: <><C>huella</C> y <C>rostro</C>: probabilidad de 0 a 1. <C>firma</C>: parecido de 0 a 100. <C>prueba_de_vida</C>: si el rostro pasó la prueba de vida. <C>null</C> mientras no termina.</> },
              { nombre: 'evidencia_sha256', tipo: 'hex', req: true, desc: 'Hash del paquete de evidencia cifrado. Sirve para acreditar más tarde que la evidencia no cambió.' },
              { nombre: 'integridad', tipo: 'ok | distinta', req: true, desc: 'Resultado de descifrar la evidencia en el servidor y comparar su hash.' },
              { nombre: 'consentimiento', tipo: 'object | null', req: true, desc: 'Versión del texto aceptado por el titular y fecha.' },
              { nombre: 'retener_hasta', tipo: 'ISO 8601', req: true, desc: 'Cuándo se borra la evidencia (5 años si quedó aprobada o en revisión; 30 días si fue rechazada).' },
            ]} />
          </Endpoint>

          <Endpoint id="evidencia" metodo="GET" ruta="/v1/validaciones/:id/evidencia?motivo=…" titulo="Descargar la evidencia" rol="auditor"
            codigo={[E.evidencia]}>
            <p>Entrega el ZIP descifrado con las capturas (cédula, huella, rostro, firmas) y el informe. Es para peritajes o reclamos: <strong>cada descarga queda registrada</strong> con quién la pidió y el motivo.</p>
            <Parametros titulo="Query" filas={[{ nombre: 'motivo', tipo: 'string 5–300', req: true, desc: 'Por qué se descarga. Queda en la auditoría.' }]} />
            <p className="mt-4">Responde <C>application/zip</C>. Si la evidencia ya fue suprimida, responde <C>410 Gone</C>.</p>
          </Endpoint>

          <Endpoint id="borrar-validacion" metodo="DELETE" ruta="/v1/validaciones/:id" titulo="Suprimir una validación" rol="dpo"
            codigo={[E.borrarValidacion, E.respuestaBorrarValidacion]}>
            <p>Ejerce el derecho de supresión del titular: borra la evidencia y destruye su clave de cifrado, por lo que es <strong>irrecuperable</strong>. Se conservan solo el id, el estado, el hash y las fechas, para acreditar que existió y que se eliminó.</p>
            <Parametros filas={[{ nombre: 'motivo', tipo: 'string 5–300', req: true, desc: 'Motivo de la supresión.' }]} />
          </Endpoint>

          <Endpoint id="titular" metodo="GET" ruta="/v1/titulares/:rut/validaciones" titulo="Validaciones de un RUT" rol="dpo"
            codigo={[E.titular, E.respuestaTitular]}>
            <p>Derecho de acceso: lista todas las validaciones de tu cliente asociadas a un RUT. El RUT nunca se guarda en claro; se busca por su hash.</p>
          </Endpoint>

          {/* ───── Documentos ───── */}
          <Endpoint id="crear-documento" metodo="POST" ruta="/v1/documentos" titulo="Registrar un documento para firmar" rol="integracion"
            codigo={[E.crearDocumento, E.respuestaDocumento]}>
            <p>Envías el PDF y dónde firma cada persona. MatchOnCard:</p>
            <ol className="mb-4 grid list-decimal gap-1.5 pl-5">
              <li><strong>Sella el documento</strong> (certificación DocMDP): desde ahí solo admite completar los recuadros de firma; cualquier otro cambio queda en evidencia.</li>
              <li><strong>Crea un link por firmante</strong>. Con orden <C>libre</C> todos lo reciben de inmediato; con <C>secuencial</C>, cada uno cuando firma el anterior (webhook <C>documento.turno</C>).</li>
              <li>Cuando la validación del firmante queda <C>aprobada</C> o <C>revision</C>, <strong>estampa su firma</strong> PAdES en todos sus recuadros.</li>
              <li>Al firmar el último, el documento pasa a <C>completado</C>.</li>
            </ol>
            <Parametros filas={[
              { nombre: 'nombre', tipo: 'string 1–200', req: true, desc: 'Nombre del documento. Aparece en la estampa y en la página de captura.' },
              { nombre: 'pdf', tipo: 'base64', req: true, desc: 'El PDF en base64. Máximo 25 MB.' },
              { nombre: 'firmantes', tipo: 'array 1–20', req: true, desc: <>Cada uno con <C>rut</C>, <C>nombre</C> y <C>ubicaciones</C> (1 a 50). El orden del arreglo es el orden de firma.</> },
              { nombre: 'firmantes[].ubicaciones[]', tipo: 'object', req: true, desc: <><C>pagina</C> (desde 1), <C>x</C>, <C>y</C> en puntos PDF desde la esquina <strong>superior izquierda</strong>; <C>ancho</C> (90–600, por defecto 200) y <C>alto</C> (36–300, por defecto 70). Los recuadros no pueden superponerse.</> },
              { nombre: 'orden', tipo: 'libre | secuencial', desc: 'Por defecto libre.' },
              { nombre: 'referencia', tipo: 'string ≤ 120', desc: 'Tu identificador interno.' },
              { nombre: 'callback_url', tipo: 'url https', desc: 'Recibe los eventos del documento y de las validaciones de sus firmantes.' },
            ]} />
            <Nota>En una hoja A4 (595 × 842 puntos), un recuadro abajo a la izquierda sería <C>{'{ pagina: 1, x: 60, y: 700 }'}</C>. 1 punto = 1/72 de pulgada.</Nota>
          </Endpoint>

          <Endpoint id="listar-documentos" metodo="GET" ruta="/v1/documentos" titulo="Listar documentos" rol="integracion · auditor"
            codigo={[E.listarDocumentos, E.respuestaListarDocumentos]}>
            <p>Los últimos 100 documentos de tu cliente, del más nuevo al más antiguo, con cuántos firmantes tiene y cuántos ya firmaron.</p>
          </Endpoint>

          <Endpoint id="obtener-documento" metodo="GET" ruta="/v1/documentos/:id" titulo="Consultar un documento" rol="integracion · auditor · dpo"
            codigo={[E.obtenerDocumento]}>
            <p>Estado del documento, su versión y hash actual, y el detalle de cada firmante: estado, recuadros, validación asociada y fecha de firma.</p>
            <Tabla cabeza={['Estado del firmante', 'Significado']} filas={[
              [<C key="1">en_espera</C>, 'Orden secuencial: aún no es su turno.'],
              [<C key="2">pendiente</C>, 'Tiene un link activo y no ha terminado la validación.'],
              [<C key="3">validado</C>, 'Se validó; su firma se está estampando.'],
              [<C key="4">firmado</C>, 'Firma estampada. Si su validación quedó en revision, se indica en observaciones.'],
              [<C key="5">cancelado</C>, 'El documento se canceló antes de que firmara.'],
            ]} />
          </Endpoint>

          <Endpoint id="descargar-pdf" metodo="GET" ruta="/v1/documentos/:id/pdf" titulo="Descargar el PDF" rol="integracion · auditor"
            codigo={[E.descargarPdf]}>
            <p>Devuelve la versión vigente del PDF (sellado, con las firmas que lleve). Las cabeceras <C>X-Documento-Version</C> y <C>X-Documento-Sha256</C> te permiten guardar y comprobar cada versión.</p>
          </Endpoint>

          <Endpoint id="reenviar-enlace" metodo="POST" ruta="/v1/documentos/:id/firmantes/:fid/enlace" titulo="Nuevo link para un firmante" rol="integracion"
            codigo={[E.reenviarEnlace, E.respuestaReenviarEnlace]}>
            <p>Emite un link nuevo cuando el anterior venció, se perdió o la validación salió rechazada. <strong>El link anterior deja de servir.</strong></p>
            <p>Responde <C>409</C> si no es su turno, si ya firmó o si está validándose en este momento.</p>
          </Endpoint>

          <Endpoint id="cancelar-documento" metodo="POST" ruta="/v1/documentos/:id/cancelar" titulo="Cancelar un documento" rol="integracion"
            codigo={[E.cancelarDocumento]}>
            <p>Cancela un documento <C>pendiente</C>: invalida los links activos y los firmantes que faltan pasan a <C>cancelado</C>. Envía el webhook <C>documento.cancelado</C>.</p>
            <Parametros filas={[{ nombre: 'motivo', tipo: 'string 5–300', req: true, desc: 'Motivo de la cancelación.' }]} />
          </Endpoint>

          <Endpoint id="suprimir-documento" metodo="DELETE" ruta="/v1/documentos/:id" titulo="Suprimir un documento" rol="dpo"
            codigo={[E.suprimirDocumento]}>
            <p>Borra todas las versiones del PDF y destruye su clave. Es irreversible.</p>
            <Parametros filas={[{ nombre: 'motivo', tipo: 'string 5–300', req: true, desc: 'Motivo de la supresión.' }]} />
          </Endpoint>

          <Endpoint id="verificar" metodo="POST" ruta="/verificar/api" titulo="Verificar un PDF firmado" rol="público"
            codigo={[E.verificarPdf]}>
            <p>Cualquiera puede comprobar las firmas y la integridad de un PDF firmado con MatchOnCard, sin credenciales. El archivo se revisa y se descarta. También está la página <Link href="/verificar" className="text-accent">matchoncard.cl/verificar</Link>.</p>
            <p>Envía el PDF como cuerpo crudo con <C>Content-Type: application/pdf</C>. Límite: 12 solicitudes por minuto.</p>
          </Endpoint>

          {/* ───── Referencia ───── */}
          <Bloque id="webhooks" titulo="Webhooks"
            codigo={<><Codigo titulo="Ejemplos de eventos" muestras={E.webhookValidacion} /><Codigo titulo="Verificar la firma" muestras={E.verificarWebhook} /></>}>
            <p>Cuando algo cambia, hacemos un <C>POST</C> JSON a tu <C>callback_url</C>. Cada envío lleva estas cabeceras:</p>
            <Tabla cabeza={['Cabecera', 'Contenido']} filas={[
              [<C key="1">X-V3P-Evento</C>, 'Nombre del evento.'],
              [<C key="2">X-V3P-Entrega</C>, 'Id único de la entrega. Úsalo para descartar duplicados.'],
              [<C key="3">X-V3P-Firma</C>, <span key="x"><C>sha256=</C> + HMAC-SHA256 del cuerpo crudo con tu <C>secreto_webhook</C>.</span>],
            ]} />
            <p><strong>Verifica siempre la firma</strong> antes de confiar en el contenido, usando el cuerpo exactamente como llegó y una comparación de tiempo constante.</p>
            <h3 className="mb-2 mt-8 text-xl text-ink">Eventos</h3>
            <Tabla cabeza={['Evento', 'Cuándo']} filas={[
              [<C key="1">validacion.finalizada</C>, 'El firmante terminó: el estado ya es aprobada, revision o rechazada.'],
              [<C key="2">validacion.expirada</C>, 'El link venció sin que se completara.'],
              [<C key="3">documento.turno</C>, <span key="t">Orden secuencial: le toca al siguiente firmante. Trae su <C>url_captura</C>.</span>],
              [<C key="4">documento.firmado</C>, 'Se estampó la firma de un firmante.'],
              [<C key="5">documento.completado</C>, 'Firmaron todos. Descarga el PDF final.'],
              [<C key="6">documento.validacion_fallida</C>, 'La validación de un firmante salió rechazada. Puedes emitirle un link nuevo.'],
              [<C key="7">documento.cancelado</C>, 'El documento se canceló.'],
            ]} />
            <h3 className="mb-2 mt-8 text-xl text-ink">Reintentos</h3>
            <p>Respondes con cualquier <C>2xx</C> en menos de 10 segundos y la entrega queda confirmada. Si no, reintentamos hasta <strong>8 veces</strong> con espera creciente (1, 2, 4, 8… minutos). Un mismo evento puede llegar más de una vez: tu endpoint debe ser idempotente.</p>
          </Bloque>

          <Bloque id="estados" titulo="Estados y motivos">
            <p>La regla de decisión exige al menos <strong>2 de 3 factores</strong> correctos (huella, rostro y firma):</p>
            <Tabla cabeza={['Estado', 'Qué significa', 'Qué hacer']} filas={[
              [<span key="a" className="font-mono text-sm text-ok">aprobada</span>, 'Coinciden los 3 factores, el RUN de la cédula y la evidencia está íntegra.', 'Continuar.'],
              [<span key="r" className="font-mono text-sm text-warn">revision</span>, '2 de 3 factores, o falta algún control (RUN no leído, evidencia con observaciones).', 'Permite firmar; la estampa dice "validación con observaciones". Revisa los motivos.'],
              [<span key="x" className="font-mono text-sm text-bad">rechazada</span>, 'Menos de 2 factores, o la cédula es de otra persona.', 'No continuar. Puedes pedir una nueva validación.'],
              [<C key="c">creada · en_captura · consentida</C>, 'En curso: link creado, abierto o con consentimiento otorgado.', 'Esperar el webhook.'],
              [<C key="e">expirada · borrada</C>, 'El link venció, o la evidencia se suprimió.', '—'],
            ]} />
            <h3 className="mb-2 mt-8 text-xl text-ink">Motivos</h3>
            <Tabla cabeza={['Motivo', 'Qué pasó']} filas={[
              [<C key="1">run_distinto</C>, 'La cédula es de otra persona. La validación queda rechazada.'],
              [<C key="2">run_no_leido</C>, 'No se pudo leer el RUN de la cédula. Una aprobación pasa a revisión.'],
              [<C key="3">huella_no_coincide · rostro_no_coincide · firma_no_coincide</C>, 'Ese factor no coincidió.'],
              [<C key="4">huella_no_confirmada · …_no_confirmada</C>, 'Ese factor quedó dudoso.'],
              [<C key="5">huella_omitida</C>, 'La huella no se pudo leer y el titular siguió sin ella; rostro y firma deben coincidir.'],
              [<C key="6">hash_distinto · evidencia_ilegible · no_es_zip</C>, 'La evidencia no pasó el control de integridad. Una aprobación pasa a revisión.'],
            ]} />
          </Bloque>

          <Bloque id="errores" titulo="Errores" codigo={<Codigo muestras={E.errores} />}>
            <p>Los errores responden con un código HTTP y un JSON con <C>statusCode</C>, <C>message</C> (texto o lista de textos) y <C>error</C>.</p>
            <Tabla cabeza={['Código', 'Cuándo']} filas={[
              [<C key="1">400</C>, 'Cuerpo inválido: falta un campo, RUT con dígito verificador incorrecto, PDF no válido, recuadros superpuestos o un campo que no existe.'],
              [<C key="2">401</C>, 'Faltan las cabeceras, el cliente no existe o está desactivado, o el JWT es inválido, venció o dura más de 300 s.'],
              [<C key="3">403</C>, 'Tu cliente no tiene el rol que pide el endpoint.'],
              [<C key="4">404</C>, 'El recurso no existe o es de otro cliente.'],
              [<C key="5">409</C>, 'El recurso no está en un estado que permita la acción (ej. cancelar un documento completado).'],
              [<C key="6">410</C>, 'La evidencia o el documento fueron suprimidos.'],
              [<C key="7">429</C>, 'Superaste el límite de solicitudes. Espera un minuto.'],
              [<C key="8">5xx</C>, 'Error nuestro. Reintenta con espera; si persiste, escríbenos.'],
            ]} />
          </Bloque>

          <Bloque id="limites" titulo="Límites">
            <Tabla cabeza={['Qué', 'Límite']} filas={[
              ['Solicitudes por IP', '120 por minuto'],
              ['Registro de documentos', '30 por minuto'],
              ['Verificación pública de PDF', '12 por minuto'],
              ['Tamaño del PDF', '25 MB'],
              ['Firmantes por documento', '20 (hasta 50 recuadros cada uno)'],
              ['Vigencia del JWT', '300 segundos'],
              ['Vigencia del link de captura', '24 horas'],
              ['Tiempo para completar la captura', '40 minutos desde que se abre'],
              ['Conservación de la evidencia', '5 años si quedó aprobada o en revisión; 30 días si fue rechazada'],
            ]} />
            <Nota>¿Necesitas otros límites o un ambiente de pruebas? Escríbenos a <a href="mailto:jgomez@portalfirma.cl" className="text-accent">jgomez@portalfirma.cl</a>.</Nota>
          </Bloque>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
