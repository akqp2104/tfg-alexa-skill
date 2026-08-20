const focusInstructions = {
  lowMood:
    "crear una situación que permita observar cómo afronta el personaje una experiencia negativa o decepcionante",

  anhedonia:
    "crear una situación donde exista la posibilidad de participar en una actividad normalmente agradable o interesante",

  lowEnergy:
    "crear una situación donde el personaje deba decidir cuánto esfuerzo dedicar a una actividad cotidiana",

  lowSelfWorth:
    "crear una situación donde el personaje reciba feedback, cometa un error o valore su propia actuación",

  socialWithdrawal:
    "crear una situación donde exista una oportunidad natural de interacción social",

  worry:
    "crear una situación con cierta incertidumbre sobre un resultado futuro",

  tension:
    "crear una situación ligeramente exigente o incómoda que pueda provocar nerviosismo o dificultad para relajarse",

  avoidance:
    "crear una situación donde el personaje pueda afrontar o evitar algo que le genera incomodidad",

  somaticAnxiety:
    "crear una situación de activación o presión donde pueda aparecer de forma natural atención a sensaciones físicas",

  sleepDisturbance:
    "crear una situación donde el descanso, el sueño reciente o la planificación del descanso tenga relevancia natural",

  concentrationDifficulty:
    "crear una situación que requiera mantener la atención, organizar información o tomar una decisión",
};

function getFocusInstructions(focus) {
  return focusInstructions[focus] || "";
}

module.exports = {
  getFocusInstructions,
};
