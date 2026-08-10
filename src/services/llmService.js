async function generate(prompt) {
  console.log("Prompt:", prompt);

  // Por ahora usaremos un resultado simulado para la escena inicial.
  return {
    narrative:
      "Son casi las ocho de la tarde. Estás en la biblioteca terminando una presentación para mañana. " +
      "Llevas un buen rato trabajando y empiezas a notar el cansancio. " +
      "¿Prefieres seguir trabajando un poco más o volver a casa?",

    reprompt: "¿Prefieres seguir trabajando o volver a casa?",

    choices: [
      {
        id: "continue_working",
        text: "seguir trabajando",
        synonyms: [
          "continuar trabajando",
          "quedarme un rato más",
          "seguir aquí",
        ],
      },
      {
        id: "go_home",
        text: "volver a casa",
        synonyms: ["irme a casa", "marcharme", "volver"],
      },
    ],

    narrativeStateUpdate: {
      scene: "trabajando_en_la_biblioteca",
      location: "biblioteca universitaria",
      timeOfDay: "tarde",

      characterEmotion: {
        primary: "neutral",
        intensity: 0,
      },

      characterGoal: "terminar una presentación para el día siguiente",

      relationships: {},

      openConflicts: ["La presentación todavía no está terminada"],

      commitments: [],

      recentEvents: ["El protagonista está trabajando en una presentación"],

      storyProgress: "introduction",
    },
  };
}

module.exports = {
  generate,
};
