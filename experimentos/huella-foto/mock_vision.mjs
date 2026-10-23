// Modelo de mano SIMULADO para pruebas locales (sin Internet). window.__mano = 'derecha' | 'izquierda' | 'pulgar' | 'indice' | 'nada'
const pts = (tipo) => {
  const P = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.95, z: 0 }));
  if (tipo === 'derecha' || tipo === 'izquierda') {   // mano abierta
    const base = [[0.5,0.85],[0.38,0.78],[0.32,0.7],[0.28,0.62],[0.25,0.55],[0.42,0.6],[0.41,0.48],[0.40,0.40],[0.40,0.33],[0.5,0.58],[0.5,0.45],[0.5,0.36],[0.5,0.28],[0.58,0.6],[0.59,0.48],[0.6,0.40],[0.6,0.33],[0.65,0.64],[0.67,0.55],[0.68,0.49],[0.69,0.44]];
    return base.map(([x, y]) => ({ x, y, z: 0 }));
  }
  if (tipo === 'pulgar') { P[4] = { x: 0.5, y: 0.42, z: 0 }; P[3] = { x: 0.52, y: 0.55, z: 0 }; }
  if (tipo === 'indice') { P[8] = { x: 0.5, y: 0.42, z: 0 }; P[4] = { x: 0.15, y: 0.8, z: 0 }; }
  return P;
};
export const FilesetResolver = { forVisionTasks: async () => ({}) };
export const HandLandmarker = { createFromOptions: async () => ({ detectForVideo: () => {
  const t = window.__mano || 'nada'; if (t === 'nada') return { landmarks: [], handedness: [] };
  // con cámara trasera, MediaPipe etiqueta "Left" a la mano derecha
  return { landmarks: [pts(t)], handedness: [[{ categoryName: t === 'izquierda' ? 'Right' : 'Left', score: 0.95 }]] };
} }) };
