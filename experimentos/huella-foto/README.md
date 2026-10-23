# Experimentos: huella con fotos en vez de escaneo continuo

Variantes **de prueba** de la app de captura. No reemplazan a `app/legacy/validacion_3_pasos.html` (producción): se generan como archivos aparte, a partir de él, sin modificar el FPEngine.

| Script | Genera | Qué cambia |
|---|---|---|
| `build_foto.py` | Prueba 1 | Un botón "Tomar foto": ráfaga de 1,2 s, se queda con el cuadro más nítido y lo compara con la cédula (`jointVerify` de un solo fotograma). |
| `build_foto2.py` | Prueba 2 (sobre la 1) | Primero, mano abierta (MediaPipe HandLandmarker: verifica mano derecha); luego el pulgar en el círculo (avisa si hay otro dedo); 3 fotos automáticas; combinación igual a `session()` del flujo actual, y "Coincide" solo si ≥ 2 fotos concuerdan. |

```bash
python3 build_foto.py  ../../app/legacy/validacion_3_pasos.html /tmp/prueba1.html
python3 build_foto2.py /tmp/prueba1.html /tmp/prueba2.html    # la 2 parte de la 1
```

Los scripts aplican reemplazos exactos sobre el HTML y fallan (assert) si producción cambió en esos puntos. En ese caso hay que actualizar el reemplazo.

**Pruebas locales sin Internet:** `mock_vision.mjs` simula el modelo de mano (`window.__mano = 'derecha' | 'izquierda' | 'pulgar' | 'indice' | 'nada'`). Se activa con `window.COTEJO_CONFIG = { debug: true, mpVision: '/mock_vision.mjs' }`.

## Resultados hasta ahora (oct. 2026)

**Prueba 1** (`evaluar_1foto.py`, 3 personas, 40 fotos, 190 comparaciones):

| | Contra su propia cédula | Contra la cédula de otra persona |
|---|---|---|
| ≥ 99 % | 44 % | 2 % |
| ≥ 90 % | 45 % | 6 % |
| Mediana | 82 % | 0,3 % |

**Prueba en terreno con la prueba 1:**
- Pulgar derecho: 99,9 %.
- Índice y anular de la misma mano: **97 %**. Es un falso positivo, porque son huellas distintas.

**Conclusión:** una sola foto no discrimina lo suficiente. La prueba 2 agrega la verificación del dedo y exige concordancia entre fotos. Falta medirla en terreno, sobre todo con dedos que no son el pulgar derecho y con otras personas.
