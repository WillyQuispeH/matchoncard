import { SeccionSitio } from '@/components/layout/Wrap';

const MOTORES = [
  { tag: 'FPEngine', titulo: 'Huella por fotogramas', texto: 'No pide una foto perfecta: junta muchos fotogramas nítidos del pulgar y los compara, zona por zona, con la huella impresa de la cédula.',
    puntos: ['Dirección y frecuencia de los surcos', 'Puntos clave (minucias)', 'Evidencia acumulada entre fotogramas'] },
  { tag: 'Rostro + vida', titulo: 'Cara viva, no una foto', texto: 'Compara el rostro de la selfie con la foto de la cédula y exige gestos naturales para descartar fotos o pantallas.',
    puntos: ['Detección de parpadeo', 'Giro de cabeza', 'Varias tomas comparadas entre sí'] },
  { tag: 'SigEngine', titulo: 'Firma con el dedo', texto: 'Extrae la firma impresa de la cédula, limpia el texto que la rodea y la compara con firmas hechas en pantalla.',
    puntos: ['Forma, contornos y proporciones', 'Dirección e inclinación de los trazos', 'Alineación tolerante a variaciones'] },
];
const EXTRAS = [
  ['Lectura del documento', 'Lee el RUN del frente y del reverso (MRZ) y revisa que coincidan entre sí y con la persona esperada.'],
  ['Se adapta al equipo', 'Ajusta la cámara, el enfoque y el ritmo de captura según el modelo, sea iPhone o Android.'],
  ['Pensado para cualquier persona', 'Guía con voz, círculo de colores, vibración al lograr una buena toma y demostraciones animadas.'],
];

export function Tecnologia() {
  return (
    <SeccionSitio id="tecnologia" eyebrow="Tecnología" titulo="Motores propios, pensados para un teléfono común."
      texto="Cada factor tiene su propio motor de comparación. Todos corren en el navegador del teléfono y se adaptan a la cámara del equipo.">
      <div className="grid grid-cols-3 gap-[18px] max-[980px]:grid-cols-1">
        {MOTORES.map((m) => (
          <div key={m.tag} className="rounded-[20px] border border-line bg-surface px-6 py-7">
            <span className="inline-block rounded-full bg-accent/10 px-2.5 py-[5px] font-mono text-xs font-medium text-accent">{m.tag}</span>
            <h3 className="mb-3 mt-[18px] text-2xl">{m.titulo}</h3>
            <p className="text-base text-ink-2">{m.texto}</p>
            <ul className="mt-4 grid list-none gap-2 p-0 text-[15px] text-ink-2">
              {m.puntos.map((x) => (
                <li key={x} className="relative pl-5 before:absolute before:left-0 before:top-2.5 before:h-0.5 before:w-2 before:bg-accent before:content-['']">{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-[18px] grid grid-cols-3 gap-[18px] max-[980px]:grid-cols-1">
        {EXTRAS.map(([t, x]) => (
          <div key={t} className="rounded-2xl border border-dashed border-line-2 px-5 py-[18px] text-[15px] text-ink-2">
            <b className="mb-1 block text-base text-ink">{t}</b>{x}
          </div>
        ))}
      </div>
    </SeccionSitio>
  );
}
