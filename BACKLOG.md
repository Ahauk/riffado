# Riffado — Backlog

## En curso / listo en local

- ✅ P1 — Análisis funcional (grados armónicos) + capo inteligente + suavizado temporal.
- ✅ P1.5 — Progressive disclosure con tooltips contextuales.
- ✅ P2 — Home con historial + Settings + Glosario + Splash narrado.
- ✅ Tab bar (Inicio / Historial / Afinador placeholder).
- ✅ Fusión Home+Record en un solo tap.
- ✅ Baseline detector 70% exact / 75% root (librosa + templates).
- ✅ **Edición manual de acordes** — tap en badge o en botón "Cambiar acorde"
  del detalle → picker con sugerencias inteligentes (sibling triad + acordes
  diatónicos en orden de prominencia) + toggle "Ver todos". Corrección se
  persiste en AsyncStorage sin mutar `detected`/`simplified` originales
  (data gold preservada). Grado romano de la corrección se recomputa
  client-side. Transparencia de calidades ricas: si el detector oyó `Gmaj7`
  pero mostramos `G`, el sufijo aparece en gris junto al nombre.
- ✅ **Estimación de tonalidad desde acordes detectados** — reemplaza el
  K-S ingenuo sobre chroma cruda. Scorea tonalidades por hits diatónicos
  sobre la progresión, con tiebreakers por primer-acorde-es-tónica,
  tónica-aparece-en-progresión y chroma K-S como último recurso.
- ✅ **Límite de grabación a 60 s** (antes 15 s) con contador mm:ss.
- ✅ **Huella armónica compacta**: el pill de grados ahora muestra únicos
  en orden de primera aparición (`I – ii` en vez de `I – ii – I – ii...`),
  recomputada client-side para reflejar correcciones del user. Se quitó
  el `?` visual del hint porque se confundía con el símbolo de acorde
  no-diatónico.
- ✅ **Upload de audio local** (expo-document-picker) — botón "Sube una
  rola y Riffate!" en Home abre Files app, filtra por `audio/*`, sube
  al mismo endpoint. Backend rechaza >3 min con error `too_long`.
  AnalyzingScreen rediseñada: ring animado, título Bebas, subtítulos
  rotantes cada 3.5s entre fases reales ("Subiendo", "Escuchando notas",
  "Detectando acordes", etc.), barra de progreso con easing 0→95% en
  40s (salta a 100% en response).
- ✅ **Swipe-to-delete** en historial con confirmación Alert.
- ✅ **Shapes de 7mas comunes** (15 shapes): Cmaj7/Dmaj7/Fmaj7/Gmaj7/Amaj7,
  C7/D7/E7/G7/A7/B7, Am7/Dm7/Em7/Bm7. Versiones "correctas/completas"
  validadas con guitarra (Fmaj7 `1x2210`, Em7 `020000`, Bm7 barré
  `x24232`). Scope de usuario incluye avanzados, no solo intermedios.
- ✅ **Ruta B del detector — reconoce 7mas automáticamente.**
  `chord_detection.py` pasa de 24 a 60 templates (añade maj7/7/m7 en
  12 raíces). `SEVENTH_BIAS = 0.88` compensa la ventaja matemática de
  templates de 4 notas. `simplify()` mantiene la 7ma cuando hay shape.
  Validación: 70%/75% → **72%/75%** (sin regresión, leve mejora).
  Casos observados: Em7 en Yesterday se detecta correctamente.
  Hay falsos positivos moderados (ej. Bm7 donde era Bm) pero
  musicalmente las notas son similares (Bm7 = Bm + 7ma neutra).
  Tuning pendiente basado en pruebas reales con el iPhone de Victor.
- ✅ **Renombrar análisis del historial.** Long-press en una card
  abre `Alert.prompt`; ✏️ junto al título en Results hace lo mismo.
  Vacío revierte al label autogenerado (`G mayor`). Hint sutil bajo
  el título "Historial" para que el long-press sea descubrible. Trim
  + cap a 60 chars.
- ✅ **Audio del análisis persistido + reproductor en Results.**
  El audio (recording o upload) se copia al `documentDirectory`
  con el `analysis_id` como nombre estable. `AudioPlayerBar` con
  play/pause SVG (no glyph Unicode → en iOS salía como emoji con
  fondo gris), scrub bar arrastrable (`@react-native-community/slider`)
  y mm:ss / mm:ss usando `expo-audio` `useAudioPlayer`. Cleanup en
  delete y al podar oldest items. `saveAnalysis` corre con `await`
  antes de navegar a Results para evitar race con el focus effect.
- ✅ **Compartir progresión como imagen.** Botón "Compartir" debajo
  de las pills en Results captura un PNG 4:5 (ideal para IG/WhatsApp)
  con wordmark RIFFADO neon, key/BPM/capo pills, huella armónica y
  hasta 8 diagramas únicos en grilla 4-col (`+N más` cuando hay
  más). `react-native-view-shot` + `expo-sharing`.
- ✅ **Pentagrama animado en AnalyzingScreen.** Reemplaza la bola
  morada con SVG: 5 líneas + clave de sol morada + 5 cabezas de nota
  que se desplazan derecha→izquierda en loop con stagger, cada una
  rotada sobre su propio centro adentro de un `AnimatedG` para que
  no se desvíen del pentagrama. Copy: "Rifando tu rola" → "Analizando
  tu rola / para que te **Riffes**" (Riffes en morado brand).
- ✅ **Highlight del acorde activo durante playback.** El player se
  subió a `ResultsScreen` (controlado en lugar de autocontenido) y
  pasa `player + status` al `AudioPlayerBar`. El acorde cuyo
  `[start_sec, end_sec)` contiene `currentTime` se tiñe en
  `primaryTint` con borde izquierdo morado y timestamp en
  `primarySoft`; la `FlatList` hace `scrollToIndex` con
  `viewPosition: 0.5`. Auto-scroll solo mientras `playing=true` para
  respetar el scroll manual del usuario al pausar.
- ✅ **Afinador cromático con YIN.** Tab "Afinador" funcional:
  `@siteed/audio-studio` con `streamFormat=float32` da chunks PCM
  cada 100 ms, YIN puro detecta el f0 (16 kHz para que Hermes siga
  el ritmo en tiempo real), `noteMapping` mapea a nota + octava +
  cents + cuerda EADGBE sugerida. Aguja SVG con `Animated.spring`
  (tension 80, friction 9) para feel natural. EMA `alpha=0.85` con
  outlier rejection (jumps >40% snap-resetean el smoother) evita
  que octave errors atasquen la lectura. Hint friendly bajo la
  nota: "Apriétale tantito" / "Aflójale tantito" / "¡Ya quedó!".
  Línea de actual/meta Hz para usuarios técnicos. Auto-start al
  enfocar el tab y auto-stop al blur (sin botones). YIN tunings:
  threshold 0.18 (admite cuerdas agudas con attack rápido),
  MIN_CONFIDENCE 0.4 (filtra ruido).

## Corto plazo (próximas 1–2 sesiones)

- **Calibrar SEVENTH_BIAS con pruebas reales** — Victor debe probar
  en iPhone con (1) backing track puro triadas para confirmar que no
  salen 7mas falsas, (2) canción con 7ma real (bolero/bossa/Beatles)
  para confirmar detección, (3) clips previos para regresión.
  Si faltan 7mas reales → subir a 0.90. Si sobran falsas → bajar a 0.85.
- **Letras manuales** — pestaña "Letra" en Results es placeholder
  hoy. Versión sin licensing: textarea para que el user pegue su
  propia letra y se persista junto al análisis. Sync con timestamps
  más adelante. Musixmatch API es mediano plazo (cuesta + licensing).
- **Arpegios / fingerpicking**: actualmente el detector funciona con
  arpegios pero con menos confianza (más badges "revísalo"). Ventanas
  de análisis más largas (~2-3s vs 1s actual) o pesos más altos en
  notas bajas (bassline suele cantar la raíz) podrían mitigar.
  Chordino en mediano plazo resuelve de base.

## Mediano plazo

- **Deploy backend a Fly.io + TestFlight**: condicionado a que Victor
  esté listo para compartir con amigos beta. Fly (~$2–5/mes con
  auto-stop) es prerrequisito de TestFlight (Apple Developer $99/año).
  Si no hay usuarios externos todavía, ambos son prematuros — por eso
  salen del corto plazo. Cuando toque: Dockerfile + fly.toml, 1 GB RAM
  shared-cpu-1x, luego Apple Developer y empaquetado para TestFlight.
- **Shapes de 9nas comunes**: maj9/9/m9 en raíces básicas (C, D, E, F,
  G, A). ~10–15 shapes más. Requiere validar si el detector de chroma
  las reconoce decente (una 9na añade 5ta nota — chroma template de 5
  notas tiende a competir con triadas y dominantes 7 por confusión).
  11vas/13vas **NO** (múltiples voicings válidos por acorde, target
  guitarrista LATAM casi no los toca, detector chroma no los reconocerá).
- **Detección de secciones (verso/coro/puente)** — novelty detection con
  librosa.segment. Útil cuando pasemos a canciones de 2–3 min.
- **Canciones completas (2–3 min)** — rediseño grande, no un feature más.
  Implica: procesamiento server-side asíncrono con progress (~20–30 s),
  detección de secciones (verso/coro/puente) para agrupar la progresión,
  navegación por timeline en lugar de lista plana, y UX para ~80–120
  acordes vs ~10–15 actuales. Sesión de diseño dedicada antes de
  implementar. Hasta entonces, 60 s cubre el 90% del caso real
  (verso entero o verso+coro).
- **Mejorar detector**: Chordino / autochord vía Docker (de 70% → ~85%
  esperado). Considerar modelo ML moderno (BTC, CRNN) solo si hay
  demanda real medida.
- **Detección de secciones** (intro / verso / coro) con novelty detection
  sobre la chroma. Mejora visual en Results (agrupar progresión por
  sección).
- **Strumming pattern** sugerido — detectar ritmo con onset detection y
  sugerir pattern (ej. "D DU UDU" para baladas pop).
- **Metrónomo** para practicar con el fragmento loopeado.
- **Settings más completo**:
  - Toggle "mostrar grados armónicos" (default on).
  - Toggle "sugerir capo automáticamente" (default on).
  - Limpiar historial.
  - Enviar feedback (mailto o formulario).
  - Idioma (es-MX / es-ES / futuro en).
- **Branding real**: logo propio (no solo texto), splash asset diseñado,
  tipografía custom vía expo-font (Space Grotesk, Plus Jakarta Sans, etc.).
- **Wordmark con clave de Fa** reemplazando una de las F de "Riffado".
  La clave de Fa ("F clef") se llama así por la nota Fa y su forma
  recuerda una F, lo cual encaja doblemente con la marca (Fa en solfeo
  hispano → Rif-FA-do). Implementación sugerida: SVG custom que
  integre la clave de fa con la tipografía Bebas Neue a la altura
  correcta. Considerar variantes: RI𝄢FADO / RIF𝄢ADO / RIFFAD𝅝 (O como
  redonda). Decidir en sesión de diseño dedicada.

## Mediano plazo — condicionado a validación

- **Song recognition como HINT INTERNO** (ShazamKit).
  Solo integrar si en beta ≥60% de usuarios piden "dime qué canción es",
  y aun así **nunca** reemplazando al detector ni mostrando acordes
  tomados de terceros. Uso permitido: ajustar confianza del detector
  propio cuando sabemos la canción (ej. "es Let It Be → priorizo F sobre
  Fmaj7 en zonas dudosas"). Metadata opcional (título/artista/año) como
  enriquecimiento visual si se integra. El splash "no somos Shazam"
  seguiría válido porque no damos el match al usuario como respuesta.
  ShazamKit gratis con Apple Developer $99/año. ACRCloud descartado
  ($0.005/req + lock-in).
- **NO scrapear Ultimate Guitar / Chordify / E-Chords** — confirmado.
  Viola ToS + copyright + App Store rejection. Ocultar título/artista
  no resuelve el licensing de la progresión misma. Además rompe el
  diferenciador de producto: si mostramos los acordes ya resueltos de
  una canción conocida, estamos haciendo Chordify con menos catálogo.
  Riffado vive de ser el detector de oído para cualquier rola,
  incluyendo la que NO está en Chordify.
- **Letras con licencia**: Musixmatch API (preferido por calidad + sync).
  Alternativa gratuita: botón "Buscar letra" que abre Safari en google.
  Nunca hacer scraping: mismas razones que arriba.
- **Favoritos** en historial.

## Largo plazo

- **TestFlight** (cuando haya Apple Developer, $99/año). Empezar con 10–20
  guitarristas beta.
- **Modelo ML propio** entrenado con correcciones de usuarios como labels.
- **Android** (reuso de Expo, validar audio nativo).
- **Tabs automáticas** — proyecto grande por sí solo.
- **Import desde Spotify/Apple Music** — requiere licensing complejo
  (Spotify cierra acceso a audio stream desde 2023, Apple requiere MusicKit
  + subscripción activa del usuario). Baja prioridad.

## Calidad y salud del producto

- **Testing**:
  - Unit tests del simplifier + key estimator + capo suggester (pytest).
  - Unit tests del helper time/formatTime + confidenceBadge (jest).
  - Integration test del endpoint `/v1/analyze` con fixtures WAV.
  - Dataset de validación ampliado a 50 canciones con ground truth.
- **Observabilidad**:
  - Sentry para crashes mobile + errores backend.
  - Posthog para eventos de producto: recording_started, analysis_completed,
    chord_edited, mode_toggled, feedback_submitted.
  - Dashboard: funnel record → upload → results → diagram → edit.
- **Métricas MVP**:
  - % análisis completados sin error (target >90%).
  - % usuarios que corrigen al menos 1 acorde (si >50% → detector malo).
  - Retención D7.
  - Pregunta in-app tras el 3er análisis: "¿Te ayudó?" (sí / más o menos /
    no). Target >60% sí+más o menos.

## Accesibilidad

- VoiceOver labels en todos los componentes interactivos (parcial).
- Dynamic Type respetado (pendiente auditoría).
- Haptics en inicio/fin de grabación, selección de acorde.
- Contraste WCAG AA en todos los textos (auditar, morado sobre negro cuida).

## Riesgos abiertos

- **Precisión del detector**: 70% exact es aceptable para MVP, no para
  escalar. Plan de fix claro (Chordino → ML propio) documentado.
- **Audio del iPhone en vivo**: mezclas complejas, distorsión, ruido
  ambiente degradan resultados. Comunicar expectativas en onboarding.
- **Arpegios vs rasgueo**: chroma templates funcionan con ambos, pero
  arpegios dan menos confianza (más badges "revísalo"). Canciones
  acústicas tipo Dust in the Wind, Blackbird son casos de más ruido.
  Chordino en mediano plazo mitiga.
- **Dos instrumentos armónicos simultáneos** (rítmica + lead): el chroma
  mezcla todas las notas, no separa por instrumento. Source separation
  (Spleeter/Demucs) separa en voz/bajo/batería/otros pero NO distingue
  guitarra rítmica vs lead (mismo timbre) — es investigación activa de
  MIR. Workaround hoy: grabar en momentos sin lead.
- **App Store rejection**: permisos de mic (copy ya incluido), nada de
  contenido con copyright sin licencia.
- **Escalabilidad backend**: librosa + numba consumen CPU. Fly.io con
  2 vCPU aguanta ~50 req/min. A escala, considerar worker queue.
