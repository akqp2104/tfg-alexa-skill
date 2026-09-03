const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = process.env.LLM_MODEL || "gemini-3.5-flash-lite";

const USE_LLM_MOCK = process.env.USE_LLM_MOCK === "true";

async function generate({
  prompt,
  responseJsonSchema,
  zodSchema,
  task = "unknown",
  semanticValidator = null,
  normalizer = null,
  maxOutputTokens = 800,
}) {
  if (USE_LLM_MOCK) {
    throw new Error(`Mock not implemented for task: ${task}`);
  }

  return generateWithGemini({
    prompt,
    responseJsonSchema,
    zodSchema,
    task,
    semanticValidator,
    normalizer,
    maxOutputTokens,
  });
}

async function generateWithGemini({
  prompt,
  responseJsonSchema,
  zodSchema,
  task,
  semanticValidator,
  normalizer,
  maxOutputTokens,
}) {
  const start = Date.now();

  try {
    const response = await ai.models.generateContent({
      model: MODEL,

      contents: prompt,

      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        maxOutputTokens,
      },
    });

    const latencyMs = Date.now() - start;

    const usage = response.usageMetadata;

    console.log("LLM_CALL_SUCCESS", {
      task,
      model: MODEL,
      latencyMs,
      promptTokenCount: usage?.promptTokenCount ?? null,
      candidatesTokenCount: usage?.candidatesTokenCount ?? null,
      totalTokenCount: usage?.totalTokenCount ?? null,
    });

    let parsed;

    try {
      parsed = JSON.parse(response.text);
    } catch (error) {
      const parsingError = new Error("LLM_INVALID_JSON");

      parsingError.code = "LLM_INVALID_JSON";

      throw parsingError;
    }

    const candidate = normalizer ? normalizer(parsed) : parsed;
    const validation = zodSchema.safeParse(candidate);

    if (!validation.success) {
      const validationIssues = validation.error.issues.map(formatZodIssue);

      console.error("LLM schema validation failed:", {
        task,
        issueCount: validationIssues.length,
        issues: validationIssues,
      });

      const schemaError = new Error("LLM_SCHEMA_INVALID");

      schemaError.code = "LLM_SCHEMA_INVALID";
      schemaError.validationIssues = validationIssues;

      throw schemaError;
    }

    if (semanticValidator) {
      const semanticValidation = semanticValidator(validation.data);

      if (!semanticValidation.valid) {
        console.error("LLM semantic validation failed:", {
          task,
        });

        const semanticError = new Error("LLM_SEMANTIC_INVALID");

        semanticError.code = "LLM_SEMANTIC_INVALID";

        semanticError.reason = semanticValidation.reason;

        throw semanticError;
      }
    }

    return validation.data;
  } catch (error) {
    console.error("LLM ERROR:", {
      task,
      code: error?.code || null,
      status: error?.status || null,
      name: error?.name || "Error",
    });

    if (error.status === 429) {
      const quotaError = new Error("LLM_QUOTA_EXCEEDED");

      quotaError.code = "LLM_QUOTA_EXCEEDED";

      throw quotaError;
    }

    if (error.status === 404) {
      const modelError = new Error("LLM_MODEL_UNAVAILABLE");

      modelError.code = "LLM_MODEL_UNAVAILABLE";

      throw modelError;
    }

    if (typeof error?.code === "string" && error.code.startsWith("LLM_")) {
      throw error;
    }

    if ([500, 502, 503, 504].includes(error?.status)) {
      const serviceError = new Error("LLM_SERVICE_UNAVAILABLE");
      serviceError.code = "LLM_SERVICE_UNAVAILABLE";
      serviceError.status = error.status;
      throw serviceError;
    }

    const providerError = new Error("LLM_PROVIDER_ERROR");
    providerError.code = "LLM_PROVIDER_ERROR";
    providerError.status = error?.status;

    throw providerError;
  }
}

function formatZodIssue(issue) {
  return {
    path: issue.path.join("."),
    code: issue.code,
    expected: issue.expected ?? null,
    minimum: issue.minimum ?? null,
    maximum: issue.maximum ?? null,
  };
}

module.exports = {
  generate,
};
