const { GoogleGenAI } = require("@google/genai");
const narrativeResponseSchema = require("../schemas/narrativeResponseSchema");
const geminiNarrativeSchema = require("../schemas/geminiNarrativeSchema");

const {
  validateNarrativeSemantics,
} = require("../validators/narrativeValidator");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = process.env.LLM_MODEL || "gemini-3.5-flash-lite";

const USE_LLM_MOCK = process.env.USE_LLM_MOCK === "true";

async function generate(prompt) {
  if (USE_LLM_MOCK) {
    console.log("LLM mode: MOCK");
    return generateMockResponse();
  }

  return generateWithGemini(prompt);
}

async function generateWithGemini(prompt) {
  console.log(`LLM mode: GEMINI (${MODEL})`);
  const start = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,

      config: {
        maxOutputTokens: 800,
        responseMimeType: "application/json",
        responseJsonSchema: geminiNarrativeSchema,

        thinkingConfig: {
          thinkingLevel: "minimal",
        },
      },
    });

    const latencyMs = Date.now() - start;
    const usage = response.usageMetadata;

    console.log("LLM metrics:", {
      model: MODEL,
      latencyMs,
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
      thinkingTokens: usage?.thinkingTokenCount ?? null,
      totalTokens: usage?.totalTokenCount ?? null,
    });

    const parsed = JSON.parse(response.text);
    const validation = narrativeResponseSchema.safeParse(parsed);

    if (!validation.success) {
      console.error("LLM schema validation failed:", validation.error.issues);
      const error = new Error("LLM_SCHEMA_INVALID");
      error.code = "LLM_SCHEMA_INVALID";

      throw error;
    }

    const semanticsValidation = validateNarrativeSemantics(validation.data);

    if (!semanticsValidation.valid) {
      console.error(
        "LLM semantics validation failed:",
        semanticsValidation.reason,
      );

      const error = new Error("LLM_SEMANTICS_INVALID");
      error.code = "LLM_SEMANTICS_INVALID";

      throw error;
    }

    return narrativeResponseSchema.parse(parsed);
  } catch (error) {
    console.error("LLM ERROR:", error);

    if (error.status === 404) {
      const modelError = new Error("LLM_MODEL_UNAVAILABLE");

      modelError.code = "LLM_MODEL_UNAVAILABLE";

      throw modelError;
    }

    if (error.status === 429) {
      const quotaError = new Error("LLM_QUOTA_EXCEEDED");
      quotaError.code = "LLM_QUOTA_EXCEEDED";
      throw quotaError;
    }

    if (error instanceof SyntaxError) {
      const parsingError = new Error("LLM_INVALID_JSON");

      parsingError.code = "LLM_INVALID_JSON";

      throw parsingError;
    }

    throw error;
  }
}

function generateMockResponse() {
  return {
    narrative:
      "Son casi las ocho de la tarde. Estás en la biblioteca terminando una presentación para mañana. " +
      "Llevas un buen rato trabajando. ¿Prefieres seguir trabajando o volver a casa?",

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
