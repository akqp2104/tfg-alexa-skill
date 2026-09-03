// Contrato de esquema para la respuesta de la API de Gemini

const geminiNarrativeSchema = {
  type: "object",

  properties: {
    narrative: {
      type: "string",
      description: "Escena breve en español, con un máximo de 1000 caracteres.",
    },

    reprompt: {
      type: "string",
      description: "Reprompt breve, con un máximo de 250 caracteres.",
    },

    storyComplete: {
      type: "boolean",
      description:
        "Indica que la historia ha terminado realmente, no solo que está en resolución.",
    },

    choices: {
      type: "array",
      minItems: 0,
      maxItems: 3,

      items: {
        type: "object",

        properties: {
          id: {
            type: "string",
            description: "Identificador breve y único, máximo 80 caracteres.",
          },

          text: {
            type: "string",
            description: "Opción breve para Alexa, máximo 120 caracteres.",
          },

          synonyms: {
            type: "array",
            maxItems: 5,
            items: {
              type: "string",
              description: "Sinónimo breve, máximo 100 caracteres.",
            },
          },
        },

        required: ["id", "text", "synonyms"],
      },
    },

    narrativeStateUpdate: {
      type: "object",

      properties: {
        scene: {
          type: "string",
        },

        location: {
          type: ["string", "null"],
        },

        timeOfDay: {
          type: ["string", "null"],
        },

        characterEmotion: {
          type: "object",

          properties: {
            primary: {
              type: "string",
            },

            intensity: {
              type: "integer",
              minimum: 0,
              maximum: 3,
            },
          },

          required: ["primary", "intensity"],
        },

        characterGoal: {
          type: ["string", "null"],
        },

        relationships: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              trust: { type: "integer", minimum: 0, maximum: 3 },
              tension: { type: "integer", minimum: 0, maximum: 3 },
            },
            required: ["trust", "tension"],
            additionalProperties: false,
          },
        },

        openConflicts: {
          type: "array",
          maxItems: 5,
          items: {
            type: "string",
          },
        },

        commitments: {
          type: "array",
          maxItems: 5,
          items: {
            type: "string",
          },
        },

        recentEvents: {
          type: "array",
          maxItems: 5,
          items: {
            type: "string",
          },
        },

        storyProgress: {
          type: "string",
          enum: ["introduction", "development", "climax", "resolution"],
        },

      },

      required: [
        "scene",
        "location",
        "timeOfDay",
        "characterEmotion",
        "characterGoal",
        "relationships",
        "openConflicts",
        "commitments",
        "recentEvents",
        "storyProgress",
      ],
      additionalProperties: false,
    },
  },

  required: [
    "narrative",
    "reprompt",
    "storyComplete",
    "choices",
    "narrativeStateUpdate",
  ],
  additionalProperties: false,
};

module.exports = geminiNarrativeSchema;
