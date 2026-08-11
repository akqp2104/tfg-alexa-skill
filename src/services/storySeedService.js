const settings = [
  "entorno académico o formativo",
  "entorno laboral",
  "casa propia",
  "casa de otra persona",
  "cafetería, restaurante o establecimiento similar",
  "espacio público urbano",
  "espacio al aire libre",
  "transporte o desplazamiento",
  "espacio cultural, deportivo o de ocio",
  "reunión o evento social",
];

const socialContexts = [
  "está solo",
  "está con alguien de confianza",
  "está con un amigo o amiga",
  "está con un compañero de estudios o trabajo",
  "está con un familiar",
  "está con varias personas conocidas",
  "está con personas a las que conoce poco",
  "está tratando con una persona desconocida",
  "está esperando encontrarse con alguien",
];

const activities = [
  "terminar una tarea o responsabilidad",
  "preparar algo para más adelante",
  "hacer una actividad cotidiana",
  "descansar o pasar un rato tranquilo",
  "dedicar tiempo a una afición o actividad de ocio",
  "conversar o tratar un asunto con alguien",
  "colaborar con otras personas en una actividad",
  "aprender, practicar o mejorar en algo",
  "organizar planes o asuntos próximos",
  "resolver una gestión o asunto práctico",
  "ir hacia algún lugar o esperar para desplazarse",
];

const triggers = [
  "algo no sale como estaba previsto",
  "surge una petición inesperada",
  "alguien propone cambiar los planes",
  "aparece una oportunidad imprevista",
  "se conoce información nueva",
  "alguien pide ayuda",
  "se produce un pequeño error o malentendido",
  "una tarea resulta más complicada de lo esperado",
  "aparece una responsabilidad adicional",
  "surgen dos opciones difíciles de compatibilizar",
  "un asunto pendiente vuelve a requerir atención",
  "alguien hace una propuesta que requiere respuesta",
  "se produce un retraso o interrupción",
  "surge la posibilidad de participar en algo",
  "una situación sencilla se complica inesperadamente",
];

const stakes = [
  "cumplir con una responsabilidad",
  "mantener un compromiso",
  "no perjudicar a otra persona",
  "aprovechar una oportunidad",
  "conseguir algo que quiere",
  "mantener una buena relación con alguien",
  "resolver algo que tiene pendiente",
  "gestionar bien su tiempo",
  "coordinarse con otras personas",
  "adaptarse a un cambio",
  "decidir cuánto quiere implicarse",
  "evitar que una situación se complique más",
];

const openingStyles = [
  "acción en curso",
  "diálogo directo",
  "acontecimiento inmediato",
  "situación cotidiana",
  "detalle del entorno",
  "interacción social",
  "objetivo inmediato",
  "interrupción",
  "información nueva",
  "decisión próxima",
];

const incompatibleCombinations = [
  {
    socialContext: "está solo",
    activity: "conversar o tratar un asunto con alguien",
  },

  {
    socialContext: "está solo",
    activity: "colaborar con otras personas en una actividad",
  },

  {
    socialContext: "está tratando con una persona desconocida",
    stakes: "mantener una buena relación con alguien",
  },

  {
    socialContext: "está tratando con una persona desconocida",
    stakes: "mantener un compromiso",
  },

  {
    setting: "reunión o evento social",
    activity: "ir hacia algún lugar o esperar para desplazarse",
  },

  {
    setting: "transporte o desplazamiento",
    activity: "colaborar con otras personas en una actividad",
  },
];

function randomItem(array) {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function isValidSeed(seed) {
  return !incompatibleCombinations.some((rule) =>
    Object.entries(rule).every(([key, value]) => seed[key] === value),
  );
}

function generateStorySeed() {
  let seed;

  do {
    seed = {
      setting: randomItem(settings),
      socialContext: randomItem(socialContexts),
      activity: randomItem(activities),
      trigger: randomItem(triggers),
      stake: randomItem(stakes),
      openingStyle: randomItem(openingStyles),
    };
  } while (!isValidSeed(seed));

  return seed;
}

module.exports = {
  generateStorySeed,
};
