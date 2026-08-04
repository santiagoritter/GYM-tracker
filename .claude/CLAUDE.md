# GymTracker — Reglas de trabajo

Leer esto **antes** de tocar código. Si algo acá contradice a un pedido
puntual, gana el pedido puntual, pero avisalo explícitamente.

## Respuesta

Respondé siempre en español rioplatense. Directo, sin relleno. Preferí
soluciones concretas sin abstracciones que todavía no hacen falta.

---

## 1. Metodología obligatoria

**Plan → Revisión crítica → Corrección → Implementación por bloques.**

1. Antes de escribir una línea, leé el código que vas a tocar. La estructura,
   las convenciones y los componentes que ya existen mandan.
2. Armá el plan: qué archivos, qué componentes nuevos, qué librerías, en qué
   orden.
3. Releélo buscando huecos: pasos faltantes, riesgo de romper algo, supuestos
   sin verificar.
4. Corregilo.
5. Implementá por bloques, validando cada uno antes del siguiente.

**No implementes nada fuera de lo pedido.** Si se te ocurre una mejora,
anotala en `IDEAS.md` y seguí.

### Verificar, no suponer

Este proyecto ya se quemó con esto: `docs/03`, `05`, `06` y `09` describían
una arquitectura Supabase que **nunca existió**, y durante meses cualquiera
que los leyera habría trabajado sobre una ficción. La documentación no es
evidencia. Antes de afirmar que algo funciona:

- Corré el build. Corré `npm test`.
- Si es algo que se ve, verificalo en el bundle desplegado, no en el commit.
- Si es una migración de datos, escribí una prueba que la ejecute con datos
  reales. Perder el historial de alguien no se deshace.

Si algo falla, decilo con el output. No lo maquilles.

---

## 2. Ramas

| Rama | Para qué |
|---|---|
| `alpha` | Versión estable previa al rediseño. Referencia. |
| `beta` | Todo el rediseño y las features nuevas. **Acá se trabaja.** |
| `main` | Producción. Solo recibe merges validados. |

El workflow de GitHub Pages solo despliega desde `main`. Trabajar en `beta`
no toca lo que el usuario tiene en el teléfono.

---

## 3. Diseño

**`DESIGN.md` es la fuente de verdad.** Color, tipografía, radios,
espaciado y movimiento salen de ahí. Un valor que no está en `DESIGN.md` no
se usa: primero se agrega al documento.

El objetivo es que el diseño **no se note hecho con IA**. Los tics
concretos a evitar están listados en `DESIGN.md §0`, tomados de
[impeccable.style/slop](https://impeccable.style/slop). Los más caros en
este proyecto:

- Glow o halo de color alrededor de nada.
- Tarjetas dentro de tarjetas.
- Redondeo excesivo (tarjetas: 14px, tope 18px).
- Bounce/elastic en interfaz.
- Etiquetas diminutas en mayúsculas con tracking sobre los títulos.
- Gradientes decorativos, spotlights radiales, grillas de fondo.
- **Emojis. Cero.** Iconos: solo Lucide.

Regla de control ante cualquier duda: *¿esto lo decidió una persona o es el
default de un generador?* Si es lo segundo, quitalo.

### Intuitivo y cómodo

La app se usa **de pie, con una mano, sudado y apurado entre series**. Eso
manda por encima de la elegancia:

- Target táctil mínimo 44×44px. Sin excepciones.
- Lo que más se usa va donde llega el pulgar: abajo.
- Cero fricción para editar un número: seleccionar todo al enfocar, teclado
  correcto, mantener apretado para repetir.
- Nunca perder datos por un tap mal dado. Confirmación en lo destructivo,
  deshacer donde se pueda.
- Estados vacío / cargando / error en toda vista con datos.
- El movimiento informa, no decora.

---

## 4. Stack real

Verificado, no aspiracional:

- React 18 + Vite 5 + TypeScript strict + React Router v6
- TailwindCSS (sin shadcn/ui: **no está instalado**)
- Zustand para estado global
- Dexie.js (IndexedDB) — **la fuente de verdad local**
- Lucide React para iconos
- Capacitor para empaquetar iOS/Android
- Supabase: diseñado, SQL en `supabase/migrations/`, **todavía sin proyecto
  creado**. Ver `docs/13-BACKEND-SUPABASE.md`.

TanStack Query está en `package.json` pero **no se usa**: no hay
`QueryClientProvider`. No lo asumas disponible.

---

## 5. Código

- Nada de `any`.
- Imports absolutos con `@/`.
- Componentes en `src/components/gym/` (dominio) o `src/components/ui/` (base).
- Stores en `src/stores/`, hooks en `src/hooks/`, lógica pura en `src/lib/`.

### React

- Sin efectos para derivar estado: si sale de props o estado, calculalo en
  el render.
- `key` estable y única. Nunca el índice del array.
- Deps de efectos exhaustivas, y cleanup en todo lo que suscribe: listeners,
  timers, observers, `requestAnimationFrame`, object URLs.
- No mutar props ni resultados de hooks. `setState` con función cuando el
  nuevo valor depende del anterior.
- Nada de crear contextos, stores ni componentes dentro del render.
- Zustand: seleccionar el slice que se usa, no destructurar el store entero.
- Solo animar `transform` y `opacity`.

### Datos

- **Offline-first, sin excepciones.** Se escribe en Dexie primero; la nube
  sincroniza por debajo. La app tiene que funcionar entera en el subsuelo de
  un gimnasio sin señal.
- Los campos `updatedAt` y `dirty` los sellan los hooks de
  `src/db/syncHooks.ts`. No los escribas a mano en los call sites.
- Borrar es `softDelete()` de `src/db/mutations.ts`, nunca `.delete()`
  directo: sin lápida, el borrado no se propaga a los otros dispositivos.
- Toda query de usuario pasa por `src/db/scoped.ts`. Un usuario jamás ve
  datos de otro.
- Cambiar el esquema = nueva versión de Dexie **con** `.upgrade()` **y** una
  prueba en `scripts/test-migration.mjs`.

### Seguridad

- Contraseñas: nunca en texto plano ni con hash reversible. El SHA-256 de
  una vuelta que había antes no cuenta como hasheado.
- El cliente no es confiable. Lo que protege los datos es RLS en el
  servidor, no un `if` en el frontend.
- La anon key de Supabase es pública por diseño. La service_role nunca va al
  frontend ni a CI.

---

## 6. Verificación

```
npm test        # estilo + migraciones + recomendador
npm run build   # tsc -b && vite build
```

Antes de dar algo por terminado: build limpio y tests en verde. Si tocaste
UI, probalo en 393px de ancho (iPhone 14 Pro) — es el dispositivo real del
usuario.

---

## 7. Documentación

`docs/` tiene material aspiracional viejo mezclado con lo real. Los
confiables: `13-BACKEND-SUPABASE.md`, `14-SYNC.md`, `15-RECOMENDADOR.md`,
`DESIGN.md`, `Redisenio.md`. El resto, verificalo contra el código antes de
creerle.

Cuando cambies algo que un doc describe, actualizá el doc en el mismo
commit. Un documento que miente es peor que ninguno.
