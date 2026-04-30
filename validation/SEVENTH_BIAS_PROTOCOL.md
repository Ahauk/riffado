# Calibración de `SEVENTH_BIAS`

`SEVENTH_BIAS` (en [`apps/api/app/services/chord_detection.py`](../apps/api/app/services/chord_detection.py))
multiplica el score de los 60 templates de 7ma (maj7 / 7 / m7) para compensar
la ventaja matemática que tienen sobre las triadas: sus chroma-templates de
4 notas siempre se solapan parcialmente con la chroma de una triada por sus
overtones, así que sin penalización el detector elegiría 7mas casi siempre.

- **Bias bajo** (≤0.85): 7mas reales se pierden (Em7 en *Yesterday* se lee como Em).
- **Bias alto** (≥0.92): 7mas se inflan, hasta en pop/latino triádico aparecen `Cmaj7` falsos.
- **Sweet spot**: el más bajo que aún preserve las 7mas reales que esperas.

## Datos del sweep automático

`python sweep_seventh_bias.py` corre los 60 templates a varios biases sobre
los 20 clips de validación y reporta **% de ventanas clasificadas como 7ma**
por categoría. El ground truth está en triadas, así que `exact`/`root` no se
mueven con el bias — la métrica útil es el "apetito" del detector por 7mas.

Última corrida (2026-04-30):

| bias | % seg 7ma global | latin_pop | pop_rock_open | rock_distorsion | tonalidades_raras (Yesterday, Hey Jude) |
|------|------------------|-----------|---------------|-----------------|------------------------------------------|
| 0.82 | 3.5%             | 0%        | 5.9%          | 3.9%            | 3.9%                                     |
| 0.85 | 9.4%             | 0%        | 11.8%         | 11.8%           | 9.8%                                     |
| **0.88** (actual) | 18.2% | 3.9%      | 17.6%         | 27.5%           | 27.5%                                    |
| 0.90 | 29.1%            | 17.6%     | 25.9%         | 47.1%           | 35.3%                                    |
| 0.92 | 40.9%            | 39.2%     | 35.3%         | 56.9%           | 47.1%                                    |
| 0.95 | 61.2%            | 78.4%     | 45.9%         | 78.4%           | 60.8%                                    |

### Lectura cualitativa

- A **0.88 (actual)**, las canciones latinas pop (Manu Chao, *Espacio Sideral*,
  *Clandestino*) salen casi limpias (0–5.9% de 7mas), pero el rock distorsionado
  dispara falsos positivos (*Highway to Hell* 41%, *Black Pearl Jam* 29%).
- A **0.85**, las latinas siguen perfectas (0%) y el rock distorsionado se
  controla (5.9%). *Yesterday* y *Hey Jude* (que tienen 7mas reales) bajan
  pero conservan ~11.8% — suficiente para que el detector las marque al
  menos en alguna ventana.
- A **0.82**, las 7mas reales casi desaparecen (Yesterday 5.9%, Hey Jude 5.9%).
- A **0.90+**, las latinas se contaminan visiblemente (≥17%).

### Recomendación tentativa

**Bajar `SEVENTH_BIAS` de 0.88 → 0.85**, condicionado a las 3 pruebas iPhone
de abajo. Razón: 0.85 mantiene capacidad de detectar 7mas reales en
*Yesterday*/*Hey Jude* y reduce significativamente los falsos positivos en
rock distorsionado y mezclas complejas, sin sacrificar latin_pop.

## Protocolo de validación con iPhone

Las grabaciones del dataset son audio "limpio" (master commercial). En iPhone
con mic real entra ruido ambiente, distorsión del altavoz fuente, ecualización
local. Antes de bajar el `SEVENTH_BIAS`, comprobar 3 escenarios.

### 1. Triadas puras → cero 7mas falsas

Toca o reproduce un loop **solo** de triadas mayores/menores conocidas
(ej. backing track de "House of the Rising Sun" instrumental, o tú tocando
C-G-Am-F en bucle). Esperado: el resultado debe contener **cero** acordes
con sufijo `7`/`maj7`/`m7`. Si aparece aunque sea uno: el bias está demasiado
alto.

### 2. 7mas reales → detección consistente

Toca o reproduce un fragmento donde la 7ma sea harmónicamente esencial:

- **Bossa/bolero**: *Garota de Ipanema* (Dm7-G7), *Bésame Mucho* (verso con A7).
- **Beatles**: *Yesterday* (Em-Em7-Em6 o variantes), *Hey Jude* (E7→A7 al
  final del verso).
- **Jazz simple**: cualquier ii-V7-I (ej. Dm7-G7-Cmaj7).

Esperado: **al menos 1** acorde con 7ma debe aparecer y debe ser el que tu
oído reconoce. Si todo sale como triadas: el bias está demasiado bajo.

### 3. Regresión sobre clips conocidos

Vuelve a probar 2-3 canciones que ya validaste antes del cambio (ej. una
latina pop, una pop_rock_open, una con distorsión). Esperado: la
progresión detectada debe ser **muy similar** a la de antes; no más
acordes con 7mas en zonas que antes salían como triadas, ni triadas
nuevas en zonas que ya tenían 7ma confirmada.

## Cómo iterar

1. Edita `SEVENTH_BIAS` en [`apps/api/app/services/chord_detection.py`](../apps/api/app/services/chord_detection.py).
2. (Opcional, si vas a comparar contra el dataset) edita también
   `SEVENTH_BIAS` en [`run_validation.py`](run_validation.py) para reflejar
   la misma constante en los reportes.
3. Reinicia uvicorn (`uvicorn app.main:app --host 0.0.0.0`).
4. Corre las 3 pruebas en orden.
5. Si fallan: ajusta ±0.02 y repite. Si pasan: commit con el nuevo valor
   y nota la fecha en `BACKLOG.md` bajo "Shipped significativo".

## Re-correr el sweep

```bash
cd validation
.venv/bin/python sweep_seventh_bias.py
```

Cachea la chroma de los 20 clips una sola vez, así que el sweep completo
sobre 6 valores de bias toma ~5s. El detalle se guarda en
`results/seventh_bias_sweep.csv`.
