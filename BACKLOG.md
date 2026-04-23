# Riffado — Backlog

## En curso / listo en local

- ✅ P1 — Análisis funcional (grados armónicos) + capo inteligente + suavizado temporal.
- ✅ P1.5 — Progressive disclosure con tooltips contextuales.
- ✅ P2 — Home con historial + Settings + Glosario + Splash narrado.
- ✅ Tab bar (Inicio / Historial / Afinador placeholder).
- ✅ Fusión Home+Record en un solo tap.
- ✅ Baseline detector 70% exact / 75% root (librosa + templates).

## Corto plazo (próximas 1–2 sesiones)

- **Edición manual de acordes**: tap en badge "revísalo" o "puede ser otro" →
  picker → corregir. Data gold para iterar detector.
- **Loop/playback del fragmento** con highlight del acorde que suena.
- **Push al remoto + deploy backend a Fly.io** para probar sin el Mac local.
- **Guardar el audio de cada análisis** (en el historial, junto al JSON).
  Hoy solo guardamos la progresión; si el user quiere oír de nuevo el
  fragmento para comparar, no puede.
- **Renombrar análisis** del historial (ej. "Let It Be – verso").
- **Borrar items del historial** con swipe-to-delete.
- **Compartir progresión** como imagen (render de la lista + diagramas
  para pegar en WhatsApp, Instagram, etc.).

## Mediano plazo

- **Afinador cromático integrado** (el que Victor pidió explícito).
  Pitch detection en tiempo real (YIN o PYIN), nota + cents off,
  visualizador aguja. Mic continuo ya lo tenemos vía expo-audio. 1–2 días.
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

- **Song recognition** (ShazamKit o ACRCloud).
  Solo integrar si en beta ≥60% de usuarios piden "dime qué canción es".
  Nunca reemplazar el detector de acordes: debe ser enriquecimiento de
  metadata (título, artista, año) que complemente la progresión
  detectada. Si se integra, actualizar el copy del splash: el mensaje
  "no somos Shazam" dejaría de ser cierto y hay que rediseñar el
  positioning hacia "detector + metadata".
  Preferencia: **ShazamKit** (gratis en iOS, requiere Apple Developer
  $99/año) sobre **ACRCloud** ($0.005/request + lock-in).
  Si se integra ACRCloud: tier gratis ~500 requests/mes, luego $5/mes
  por 1k requests. A escala (10k/mes) son $50/mes.
- **Letras con licencia**: Musixmatch API (preferido por calidad + sync).
  Alternativa gratuita: botón "Buscar letra" que abre Safari en google.
  Nunca hacer scraping: viola ToS + copyright + App Store rejection.
- **Favoritos** en historial.
- **Import desde librería local** del dispositivo (Files app).

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
- **App Store rejection**: permisos de mic (copy ya incluido), nada de
  contenido con copyright sin licencia.
- **Escalabilidad backend**: librosa + numba consumen CPU. Fly.io con
  2 vCPU aguanta ~50 req/min. A escala, considerar worker queue.
