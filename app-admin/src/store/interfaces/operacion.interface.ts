// Revisión de los 3 factores (imágenes descifradas como data: URI + datos de los motores)
export interface IOperacion {
  imagenes: Record<string, string | null>;
  datos: {
    huella: { probabilidad: number | null; veredicto: string | null; fragmentos: number | null; zonas: number | null; zonasTotal: number | null; cobertura: number | null; muestraDebil: boolean };
    rostro: { probabilidad: number | null; distancia: number | null; veredicto: string | null; vida: boolean; desafios: string[]; alertas: string[] };
    firma: { parecido: number | null; consistencia: number | null; veredicto: string | null; porFirma: number[]; mejor: number };
    cedula: { nombres: string | null; apellidos: string | null; run: string | null; runValido: boolean | null; runMrz: string | null; coincidenFrenteReverso: boolean | null };
    global: string | null;
    dispositivo: string | null;
    inicio: string | null;
    fin: string | null;
    motores: Record<string, string>;
  };
}
