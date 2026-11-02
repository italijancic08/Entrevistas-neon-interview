# NEON INTERVIEW — Relevamiento de datos

Presentación interactiva (Next.js + React Three Fiber) con tres entrevistados, ocho preguntas y conclusiones.
UTN Facultad Regional Reconquista — Gestión de Desarrollo de Software.

## Desarrollo

```bash
npm install
npm run dev   # http://localhost:3000
```

Navegación: flechas del teclado, rueda, gestos táctiles, el menú superior o los puntos del pie.

## Diseño

- **Estilo**: plano y minimalista, fondo azul-petróleo oscuro (`#0b171e`), acento rojo (`#e5484d`), tarjetas translúcidas y botones en píldora.
- **Tipografía**: Montserrat (etiquetas y titulares, muy espaciados) y Raleway (texto).
- **Cabezas** (`components/three/Bust.tsx`): escaneo 3D de una cabeza humana real (`public/models/head/`), con textura de piel,
  mapa de normales y de especular. Se recorta en el cuello (sin hombros) y se apaga a oscuro hacia abajo. Cada entrevistado cambia
  de tono de piel y proporciones en `lib/theme.ts`. Iluminación desde atrás: contraluz cálido a la derecha, frío a la izquierda,
  borde (fresnel) emisivo y un halo difuso detrás.
- **Palabra fantasma** (`components/three/Ghost.tsx`): título gigante en contorno al fondo de la escena, distinto según la escena.

## Créditos

Escaneo de cabeza «Infinite» 3D Head Scan por Lee Perry-Smith, licencia CC BY 3.0 (www.triplegangers.com).
Ver `public/models/head/LICENSE.txt`.
