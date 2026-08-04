# Prompt para Claude — GYM Tracker: Fixes, Features y Rediseño

**Repo:** https://github.com/santiagoritter/GYM-tracker
**Stack:** React (candidato a empaquetar con Capacitor para app nativa)

---

## 0. Reglas obligatorias antes de tocar código

1. **Respetá la estética y los patrones de trabajo ya existentes en el repo.** Antes de escribir una sola línea, leé el código actual: estructura de carpetas, convenciones de nombres, componentes reutilizables, sistema de estilos (CSS modules / styled-components / Tailwind / lo que sea que ya se use). Todo lo nuevo tiene que integrarse con eso, no reinventarlo desde cero salvo que se indique explícitamente (ver sección de rediseño).
2. **Flujo obligatorio: Plan → Revisión → Corrección → Implementación.**
   - Primero armá un plan detallado (qué archivos se tocan, qué componentes nuevos se crean, qué librerías se suman, en qué orden).
   - Releé ese plan vos mismo de forma crítica: buscá inconsistencias, pasos faltantes, riesgos de romper algo existente.
   - Corregí el plan con lo que encontraste.
   - Recién ahí empezá a implementar, paso a paso, validando cada bloque de cambios antes de seguir con el siguiente.
3. **No implementes nada que no esté en este documento.** Si encontrás una mejora fuera de scope, anotala como sugerencia al final, no la implementes sin confirmación.
4. **Cero emojis en toda la UI y el código.** Cero.
5. **Nada de estética "IA genérica":** nada de glow/blur difuso alrededor de tarjetas o botones, nada de gradientes berretas tipo "SaaS con IA", nada de sombras exageradas. El objetivo es que el diseño **no se note hecho con IA**.
6. **Referencia estética: Apple.** Minimalista, limpio, con jerarquía tipográfica clara, mucho aire (whitespace), animaciones sutiles y con propósito. Inspiración directa: **Apple Music** (tarjetas, transiciones, tipografía, uso del color).

---

## 1. Bugs y correcciones de UX (prioridad alta)

### 1.1 Selector de series/reps/peso al crear rutina
Al crear o editar una rutina, cambiar el número de reps o peso es incómodo: si el valor es "12" y querés poner "6", hay que borrar dígito por dígito (queda "1", después hay que borrar y escribir de nuevo) en vez de poder seleccionar el número completo y sobrescribirlo directo.

**Fix esperado:**
- Al hacer foco/tap en el input, seleccionar automáticamente todo el contenido (`select()` al focus) para que escribir un número nuevo lo reemplace entero.
- Aplicar el mismo comportamiento a los campos de reps **y** de peso.
- Si se usan steppers (+/-), mantenerlos, pero el input de texto debe permitir edición directa sin fricción.

### 1.2 Sección de ejercicios confusa
El apartado donde se ven/editan los ejercicios dentro de una rutina es confuso. Rediseñar esa sección con foco en claridad: jerarquía visual clara entre ejercicio → series → reps/peso, sin ambigüedad sobre qué se está editando.

### 1.3 Elementos desbordando las cards
Hay elementos que se salen de los bordes de las cards. Auditar todas las cards de la app y corregir overflow, padding y alineación para que todo quede centrado y contenido correctamente en cualquier tamaño de pantalla.

---

## 2. Features nuevas

### 2.1 Calculadora de pesos
Calculadora que, en base a toda la información disponible del usuario (peso levantado, reps, historial, etc.), estime cosas como 1RM (repetición máxima), porcentajes de trabajo (%1RM) y progresión sugerida. Usar fórmulas estándar reconocidas (ej. Epley, Brzycki) y mostrar el resultado de forma clara.

### 2.2 Rutinas predeterminadas
Agregar rutinas base ya armadas para que el usuario elija sin tener que crear todo desde cero:
- PPL (Push/Pull/Legs)
- Arnold Split
- Upper/Lower

Deben poder importarse a "mis rutinas" y editarse libremente después.

### 2.3 Niveles por grupo muscular
Sistema de niveles/progresión por grupo muscular entrenado, calculado en base a cuánto peso levanta el usuario (con normalización razonable, ej. relación peso levantado/peso corporal, o tablas de referencia estándar por grupo muscular). Mostrar el nivel de forma visual pero sobria (nada de badges tipo videojuego con emojis).

### 2.4 Rutina favorita al iniciar entrenamiento
En la pantalla principal, al tocar "Iniciar entrenamiento", debe proponerse por defecto la rutina marcada como favorita por el usuario (agregar la posibilidad de marcar una rutina como favorita si no existe todavía).

### 2.5 Usuarios online + sincronización de progreso
- La app debe seguir funcionando **100% local y sin conexión** para el uso diario (entrenar, ver rutinas, registrar series).
- Los datos del usuario (entrenamientos, rutinas, progreso) deben poder sincronizarse a una base de datos en la nube para poder iniciar sesión desde otro dispositivo y recuperar todo el historial.
- Seguridad:
  - Contraseñas **hasheadas** (bcrypt/argon2, nunca texto plano ni hash reversible).
  - Evaluar **login con Google** (OAuth) como alternativa/complemento al login por contraseña.
  - Conexión sobre HTTPS, validación de sesión con tokens (JWT o similar), sin exponer datos sensibles en el cliente.

### 2.6 Calculadora / contador de calorías (opcional, configurable)
- El usuario puede activar o no este módulo.
- Al activarlo, define sus metas (mantenimiento, déficit, superávit — calorías objetivo).
- Carga manual de calorías consumidas a lo largo del día, que se van sumando contra la meta.

### 2.7 Apartado de configuración
Pantalla de settings con:
- Tema de la app (claro/oscuro, siguiendo el estilo Apple).
- Activar/desactivar recordatorios.
- Activar/desactivar el contador de calorías.

### 2.8 Descargar la rutina más usada del momento
Sección donde se pueda ver y descargar/importar la rutina más popular entre los usuarios (requiere datos agregados desde el backend online).

### 2.9 Notificaciones de fin de descanso
Al terminar el temporizador de descanso entre series, disparar una notificación con un mensaje motivacional (variar los mensajes, sin emojis, tono directo y motivador).

---

## 3. Rediseño visual (design system)

### 3.1 Investigación previa con Fable
Antes de tocar UI, usar **Fable** para generar un **spec de design system**: tokens (color, tipografía, espaciado, radios, sombras), componentes base (botones, cards, inputs, modales, navegación) y lineamientos de uso, pensado para que la app pueda seguir creciendo con componentes consistentes.

### 3.2 Skills e inputs de diseño a usar como referencia
- Skill: `npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng`
- Skill: `npx skills add https://github.com/emilkowalski/skills --skill apple-design`
- Revisar las webs de diseño/componentes guardadas en Firefox (carpeta de marcadores "info") como banco de referencias visuales.
- Referencias puntuales:
  - https://kokonutui.com/ — componentes de usuario y animaciones (en particular [card-flip](https://kokonutui.com/docs/cards/card-flip) para la sección de progreso).
  - https://bklit.com — referencia de métricas/analytics con animaciones más elaboradas.
  - https://impeccable.style/#why — guía para lograr que el diseño no se sienta "hecho con IA".
  - https://herdr.dev/ — terminal para gestión de agentes (herramienta de workflow, no de diseño de la app).

### 3.3 Reordenamiento de la home
- Mover el gráfico de actividad (días entrenados) a la parte superior de la pantalla principal.
- Sacar el apartado "últimos entrenos" de donde está y llevarlo a la sección de **Progreso**.

### 3.4 Lineamientos de estilo
- Minimalista, profesional, sobrio. Nada de cards genéricas ni aburridas, pero tampoco recargadas.
- Sin emojis, sin auras/glow difuso, sin gradientes tipo IA genérica.
- Animaciones sutiles y con propósito (no decorativas porque sí).
- Inspiración fuerte en Apple / Apple Music: tipografía cuidada, espaciado generoso, transiciones fluidas.

### 3.5 Rama beta para el rediseño 180°
Todo el trabajo de rediseño visual "vuelta de 180 grados" (aplicando las webs de componentes y diseño) debe hacerse en una **rama separada** (ej. `beta/redesign`), sin tocar `main`, hasta que esté validado.

---

## 4. Investigación técnica

- **Capacitor:** investigar viabilidad de empaquetar la app React actual con Capacitor para generar una app nativa (Android/iOS) reutilizando la base de código web. Documentar pros/contras, cambios necesarios en el proyecto y plan de migración antes de implementar nada.

---

## 5. Orden de trabajo sugerido

1. Plan detallado de todo lo anterior (arquitectura, archivos afectados, librerías nuevas, riesgos).
2. Revisión y corrección del plan.
3. Fixes de UX (sección 1) — son los de mayor impacto inmediato y menor riesgo.
4. Features funcionales (sección 2), priorizando lo local-first antes que la sincronización online.
5. Spec de design system (sección 3.1) en rama aparte.
6. Rediseño visual completo en `beta/redesign` (secciones 3.2–3.5).
7. Investigación de Capacitor (sección 4) como entregable de análisis, no de implementación inmediata salvo confirmación.

---

## 6. Criterios de aceptación generales

- No se rompe ninguna funcionalidad existente.
- No hay emojis en ningún componente ni string de UI.
- No hay efectos de blur/glow tipo "aura" alrededor de elementos.
- Todas las cards contienen su contenido sin overflow, en cualquier tamaño de pantalla.
- La app sigue siendo 100% usable sin conexión a internet.
- Las contraseñas nunca se guardan ni transmiten en texto plano.
- El diseño final es indistinguible de un diseño hecho a mano por un equipo de producto senior (no "se nota que es IA").
