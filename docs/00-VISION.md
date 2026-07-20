# Visión del Producto

## Qué es GymTracker

Una app web progresiva (PWA) para personas que van al gimnasio regularmente y quieren llevar un registro serio de su progreso: pesos levantados, progresión a lo largo del tiempo, fotos de cambios físicos y rutinas organizadas — todo desde el celular, funcione o no la conexión del gym.

## El problema

Las apps de gym existentes (Hevy, Strong, Jefit) resuelven el tracking básico pero tienen problemas concretos:

- **Son lentas o tienen fricción**: demasiados pasos para registrar una serie
- **El diseño es genérico**: interfaces saturadas, fondos grises default, poco foco en los números
- **Compartir rutinas es complejo**: requiere cuentas, links, o apps de terceros
- **No contextualizan el progreso**: levantás 100kg en squat, ¿es mucho o poco para tu edad y peso?
- **Muchas son de pago** para funcionalidades básicas

## Audiencia

Persona que va al gym 3-5 veces por semana, entre 18-45 años, usa el celular durante el entrenamiento, quiere saber si está progresando, y a veces comparte rutinas con amigos o el entrenador.

## Diferenciadores

| Feature | GymTracker | Hevy | Strong | Symmetric Strength |
|---------|-----------|------|--------|-------------------|
| Offline-first | ✅ | Parcial | Parcial | ❌ |
| Compartir por QR | ✅ | ❌ | ❌ | ❌ |
| Niveles por edad | ✅ | ❌ | ❌ | ✅ (solo web) |
| Fotos de progreso | ✅ | ❌ | ❌ | ❌ |
| Gratuito completo | ✅ | Freemium | Pago | ✅ |
| PWA instalable | ✅ | App nativa | App nativa | ❌ |

## Principios de producto

1. **Velocidad sobre features** — registrar una serie debe tomar 3 taps
2. **Números como protagonistas** — el peso levantado debe ser lo más visible
3. **Offline-first** — el gym tiene WiFi pésimo, la app no puede depender de eso
4. **Compartir sin fricción** — una rutina compartida por QR no requiere que el otro tenga cuenta
5. **Contexto inteligente** — mostrar si un peso es bueno o no para el perfil del usuario

## Lo que NO es esta app

- No es una app de nutrición / conteo de calorías
- No es una red social (no hay feed, no hay likes)
- No tiene planes de entrenamiento generados por IA
- No tiene videos de ejercicios (en la v1)
