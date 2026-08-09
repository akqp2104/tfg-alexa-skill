const scenes = {
  scene_1: {
    text:
      "Es de noche y acabas de llegar a casa después de un día complicado. " +
      "¿Prefieres descansar o hacer algo antes?",

    reprompt: "¿Prefieres descansar o hacer algo antes?",

    choices: {
      descansar: {
        nextScene: "scene_2_rest",
        indicators: {
          lowEnergy: 1,
        },
      },

      "hacer algo": {
        nextScene: "scene_2_activity",
        indicators: {
          lowEnergy: 0,
        },
      },
    },
  },

  scene_2_rest: {
    text:
      "Decides tumbarte un rato. Sin embargo, notas que tu cabeza sigue bastante activa. " +
      "¿Prefieres intentar dormir o quedarte pensando un rato?",

    reprompt: "¿Prefieres dormir o pensar?",

    choices: {
      dormir: {
        nextScene: "scene_3_sleep",
        indicators: {
          rumination: 0,
        },
      },

      pensar: {
        nextScene: "scene_3_think",
        indicators: {
          rumination: 1,
        },
      },
    },
  },

  scene_2_activity: {
    text:
      "Decides hacer algo para despejarte. " +
      "¿Prefieres escuchar música o hablar con alguien?",

    reprompt: "¿Prefieres escuchar música o hablar con alguien?",

    choices: {
      "escuchar música": {
        nextScene: "scene_3_music",
        indicators: {
          socialWithdrawal: 0,
        },
      },

      "hablar con alguien": {
        nextScene: "scene_3_talk",
        indicators: {
          socialConnection: 1,
        },
      },
    },
  },

  scene_3_sleep: {
    text: "Decides intentar dormir. La historia termina aquí por ahora.",
    isFinal: true,
  },

  scene_3_think: {
    text: "Te quedas pensando durante un rato. La historia termina aquí por ahora.",
    isFinal: true,
  },

  scene_3_music: {
    text: "Pones algo de música para desconectar. La historia termina aquí por ahora.",
    isFinal: true,
  },

  scene_3_talk: {
    text: "Decides hablar con alguien cercano. La historia termina aquí por ahora.",
    isFinal: true,
  },
};

module.exports = scenes;
