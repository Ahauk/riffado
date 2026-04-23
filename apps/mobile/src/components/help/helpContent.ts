/** Short explanatory bodies shown in the help bottom sheet. */

export interface HelpEntry {
  title: string;
  body: string[];
}

export const HELP: Record<string, HelpEntry> = {
  tonality: {
    title: "¿Qué es la tonalidad?",
    body: [
      "La tonalidad es el 'centro' musical de la canción — el acorde donde todo descansa y donde se siente natural terminar.",
      "Saber la tonalidad te ayuda a predecir qué acordes pueden venir. Por ejemplo, en G mayor esperas acordes como G, D, C, Em y Am.",
      "Riffado la estima del fragmento que grabaste. Si la canción cambia de tonalidad a mitad, la detecta la más fuerte.",
    ],
  },
  progression: {
    title: "¿Qué son los grados (I, ii, IV, V...)?",
    body: [
      "Los grados son la 'huella dactilar' de la progresión, independiente de la tonalidad.",
      "I, IV y V son los grados mayores; ii, iii y vi los menores. 'i' minúscula es tónica menor.",
      "Muchas canciones pop/rock usan I–V–vi–IV (las 'cuatro mágicas'). Otras baladas rock usan i–VII–iv como Wonderwall.",
      "El '?' al inicio significa que un acorde no está en la escala — es un acorde 'prestado' de otra tonalidad. Común en puentes y pre-coros.",
    ],
  },
  capo: {
    title: "¿Qué es un capo y cuándo usarlo?",
    body: [
      "Un capo es una cejilla que 'pone el dedo' en un traste completo. Sube la afinación y transforma acordes difíciles en abiertos.",
      "Ejemplo: con capo en 2, si tocas Em lo que suena es F#m. Si tocas G suena A.",
      "Riffado solo te sugiere capo cuando la tonalidad original requiere muchos barrés (F, Bm, F#m...). Si la tonalidad es cómoda, te deja en capo 0.",
      "Capo es opcional. La canción suena igual, solo cambia qué tan fácil es tocarla.",
    ],
  },
  confidence: {
    title: "¿Qué significa 'revísalo' o 'puede ser otro'?",
    body: [
      "Riffado no está 100% seguro de todos los acordes. Cuanto más compleja la mezcla (batería fuerte, sintes, distorsión), más duda.",
      "Los acordes sin etiqueta son los que detectamos con alta certeza.",
      "'revísalo' = probable, pero vale la pena confirmar a oído.",
      "'puede ser otro' = dudoso, hay buena chance de que sea otro acorde. Toca el acorde para ver su diagrama y compáralo con lo que oyes.",
    ],
  },
};
