// Contrato de esquema para la respuesta de la API de Gemini

const geminiNarrativeSchema = {
  type: "object",

  properties: {
    narrative: {
      type: "string",
    },

    reprompt: {
      type: "string",
    },

    choices: {
      type: "array",
      minItems: 2,
      maxItems: 3,

      items: {
        type: "object",

        properties: {
          id: {
            type: "string",
          },

          text: {
            type: "string",
          },

          synonyms: {
            type: "array",
            items: {
              type: "string",
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
        },

        openConflicts: {
          type: "array",
          items: {
            type: "string",
          },
        },

        commitments: {
          type: "array",
          items: {
            type: "string",
          },
        },

        recentEvents: {
          type: "array",
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
    },
  },

  required: ["narrative", "reprompt", "choices", "narrativeStateUpdate"],
};

module.exports = geminiNarrativeSchema;
