// Copia pdf.js a public/pdfjs: el panel lo carga desde el mismo origen (la CSP no permite scripts externos).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const origen = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build');
const destino = new URL('../public/pdfjs/', import.meta.url);
mkdirSync(destino, { recursive: true });
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) copyFileSync(join(origen, f), new URL(f, destino));
