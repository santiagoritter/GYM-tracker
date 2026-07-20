# Sistema de Niveles de Fuerza

## Concepto

Permite al usuario contextualizar su progreso: "levanto 100kg en sentadilla, ¿soy fuerte?". La respuesta depende del peso corporal, edad y sexo biológico. Esta feature transforma números aislados en información útil.

---

## Niveles

| Nivel | Descripción |
|-------|-------------|
| **Sin datos** | No hay suficiente historial |
| **Novato** | Primeras semanas de entrenamiento |
| **Principiante** | Algunos meses de entrenamiento consistente |
| **Intermedio** | 1-2 años de entrenamiento |
| **Avanzado** | 3+ años de entrenamiento progresivo |
| **Elite** | Top 5% de la población entrenada |
| **Campeón** | Nivel competitivo |

---

## Metodología

### Métrica base

```
ratio = 1RM_estimado / peso_corporal
```

El 1RM estimado se calcula con la fórmula de Epley a partir del mejor set histórico:
```
1RM = peso_kg × (1 + reps / 30)
```

### Ajuste por edad

Los estándares se basan en adultos de 18-34 años. Para otras edades, se aplica un multiplicador:

| Rango etario | Multiplicador |
|-------------|--------------|
| < 18 años | 0.90 |
| 18-24 años | 1.00 |
| 25-34 años | 1.00 |
| 35-44 años | 0.95 |
| 45-54 años | 0.87 |
| 55-64 años | 0.78 |
| 65+ años | 0.70 |

*El multiplicador se aplica al ratio estándar: si a los 25 años necesitás ratio 1.5 para "Intermedio", a los 45 necesitás 1.5 × 0.95 = 1.425.*

### Ajuste por sexo

Los estándares tienen tablas separadas para masculino/femenino. No es un multiplicador sino tablas distintas (las mujeres en promedio levantan ~60-65% del ratio masculino en los mismos ejercicios, lo que sigue siendo considerado el mismo nivel).

---

## Tablas de estándares

### Masculino (ratio 1RM / peso corporal)

| Ejercicio | Novato | Principiante | Intermedio | Avanzado | Elite | Campeón |
|-----------|--------|-------------|-----------|----------|-------|---------|
| Sentadilla | 0.75 | 1.25 | 1.75 | 2.25 | 2.75 | 3.00+ |
| Press Banca | 0.50 | 0.75 | 1.25 | 1.75 | 2.00 | 2.50+ |
| Peso Muerto | 1.00 | 1.50 | 2.00 | 2.50 | 3.00 | 3.50+ |
| Press Militar | 0.35 | 0.55 | 0.80 | 1.10 | 1.30 | 1.50+ |
| Remo con Barra | 0.50 | 0.75 | 1.00 | 1.35 | 1.60 | 1.75+ |
| Dominadas | 0 reps | 5 reps | 10 reps | 20 reps | 30 reps | 40+ |

### Femenino (ratio 1RM / peso corporal)

| Ejercicio | Novato | Principiante | Intermedio | Avanzado | Elite | Campeón |
|-----------|--------|-------------|-----------|----------|-------|---------|
| Sentadilla | 0.50 | 0.75 | 1.25 | 1.50 | 1.75 | 2.00+ |
| Press Banca | 0.25 | 0.50 | 0.75 | 1.00 | 1.25 | 1.50+ |
| Peso Muerto | 0.75 | 1.00 | 1.50 | 1.75 | 2.00 | 2.50+ |
| Press Militar | 0.20 | 0.35 | 0.55 | 0.75 | 1.00 | 1.25+ |
| Remo con Barra | 0.35 | 0.55 | 0.75 | 1.00 | 1.25 | 1.50+ |
| Dominadas | 0 reps | 2 reps | 6 reps | 12 reps | 20 reps | 30+ |

*Fuente: adaptado de ExRx.net Strength Standards y Symmetric Strength.*

---

## Implementación

```ts
// src/lib/strengthStandards.ts

export type StrengthLevel =
  | 'no_data'
  | 'novice'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'elite'
  | 'champion'

interface LevelThresholds {
  novice: number
  beginner: number
  intermediate: number
  advanced: number
  elite: number
  champion: number
}

// Mapeo exercise_id estándar → thresholds masculino/femenino
export const STANDARDS: Record<string, { male: LevelThresholds; female: LevelThresholds }> = {
  squat: {
    male:   { novice: 0.75, beginner: 1.25, intermediate: 1.75, advanced: 2.25, elite: 2.75, champion: 3.00 },
    female: { novice: 0.50, beginner: 0.75, intermediate: 1.25, advanced: 1.50, elite: 1.75, champion: 2.00 },
  },
  bench_press: {
    male:   { novice: 0.50, beginner: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.00, champion: 2.50 },
    female: { novice: 0.25, beginner: 0.50, intermediate: 0.75, advanced: 1.00, elite: 1.25, champion: 1.50 },
  },
  // ... deadlift, ohp, barbell_row
}

const AGE_MULTIPLIERS: Array<{ maxAge: number; multiplier: number }> = [
  { maxAge: 17,  multiplier: 0.90 },
  { maxAge: 34,  multiplier: 1.00 },
  { maxAge: 44,  multiplier: 0.95 },
  { maxAge: 54,  multiplier: 0.87 },
  { maxAge: 64,  multiplier: 0.78 },
  { maxAge: 999, multiplier: 0.70 },
]

export function getAgeMultiplier(ageYears: number): number {
  return AGE_MULTIPLIERS.find(m => ageYears <= m.maxAge)?.multiplier ?? 1.00
}

export function getStrengthLevel(
  exerciseKey: string,
  oneRmKg: number,
  bodyWeightKg: number,
  sex: 'male' | 'female',
  ageYears: number
): { level: StrengthLevel; ratio: number; nextLevel: StrengthLevel; kgToNext: number } {
  const standards = STANDARDS[exerciseKey]
  if (!standards) return { level: 'no_data', ratio: 0, nextLevel: 'novice', kgToNext: 0 }

  const ratio = oneRmKg / bodyWeightKg
  const ageMultiplier = getAgeMultiplier(ageYears)
  const thresholds = standards[sex]

  // Niveles en orden ascendente
  const levels: StrengthLevel[] = ['novice', 'beginner', 'intermediate', 'advanced', 'elite', 'champion']
  let currentLevel: StrengthLevel = 'no_data'

  for (const level of levels) {
    if (ratio >= thresholds[level] * ageMultiplier) {
      currentLevel = level
    } else {
      break
    }
  }

  // Calcular cuánto falta para el siguiente nivel
  const nextLevelIndex = levels.indexOf(currentLevel as any) + 1
  const nextLevel = levels[nextLevelIndex] ?? 'champion'
  const nextThreshold = thresholds[nextLevel as keyof LevelThresholds] * ageMultiplier
  const kgToNext = Math.max(0, (nextThreshold * bodyWeightKg) - oneRmKg)

  return { level: currentLevel, ratio, nextLevel, kgToNext: Math.round(kgToNext * 2) / 2 }
}
```

---

## Pantalla de niveles (UX)

```
┌──────────────────────────────────────────┐
│  Tu Nivel de Fuerza                      │
│  Santiago · 25 años · 80kg              │
│─────────────────────────────────────────│
│  Sentadilla                    Avanzado  │
│  Tu 1RM: 140kg  Ratio: 1.75            │
│  ●●●●●●●●●●●●●●●○○○○○  82%             │
│  Faltan 40kg para Elite                │
│─────────────────────────────────────────│
│  Press Banca                 Intermedio │
│  Tu 1RM: 100kg  Ratio: 1.25            │
│  ●●●●●●●●●○○○○○○○○○○○  52%             │
│  Faltan 40kg para Avanzado             │
│─────────────────────────────────────────│
│  Peso Muerto                    Elite   │
│  Tu 1RM: 180kg  Ratio: 2.25            │
│  ●●●●●●●●●●●●●●●●●●●○  94%             │
│  Faltan 24kg para Campeón              │
│─────────────────────────────────────────│
│  PROMEDIO GENERAL          ◆ Avanzado  │
└──────────────────────────────────────────┘
```

---

## Extensión futura

- Percentiles comparativos con usuarios anónimos de la app
- Proyección: "a este ritmo de progreso, alcanzás Elite en squat en ~6 meses"
- Notificación cuando se sube de nivel
