const { GoogleGenAI } = require("@google/genai");
const logMetric = require("../observability/logMetric");

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
  return generateWithDependencies(
    {
      prompt,
      responseJsonSchema,
      zodSchema,
      task,
      semanticValidator,
      normalizer,
      maxOutputTokens,
    },
    {
      client: ai,
      model: MODEL,
      useLlmMock: USE_LLM_MOCK,
    },
  );
}

function createLlmService({
  client,
  model = MODEL,
  useLlmMock = false,
}) {
  return {
    generate: (options) =>
      generateWithDependencies(options, { client, model, useLlmMock }),
  };
}

async function generateWithDependencies(options, dependencies) {
  const {
    task = "unknown",
    semanticValidator = null,
    normalizer = null,
    maxOutputTokens = 800,
  } = options;

  if (dependencies.useLlmMock) {
    throw new Error(`Mock not implemented for task: ${task}`);
  }

  return generateWithGemini({
    ...options,
    task,
    semanticValidator,
    normalizer,
    maxOutputTokens,
    client: dependencies.client,
    model: dependencies.model,
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
  client,
  model,
}) {
  const start = Date.now();
  let usage;

  try {
    const response = await client.models.generateContent({
      model,

      contents: prompt,

      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        maxOutputTokens,
      },
    });

    usage = response.usageMetadata;

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

      const schemaError = new Error("LLM_SCHEMA_INVALID");

      schemaError.code = "LLM_SCHEMA_INVALID";
      schemaError.validationIssues = validationIssues;

      throw schemaError;
    }

    if (semanticValidator) {
      const semanticValidation = semanticValidator(validation.data);

      if (!semanticValidation.valid) {
        const semanticError = new Error("LLM_SEMANTIC_INVALID");

        semanticError.code = "LLM_SEMANTIC_INVALID";

        semanticError.reason = semanticValidation.reason;

        throw semanticError;
      }
    }

    logMetric("LLM_CALL_SUCCESS", {
      task,
      model,
      latencyMs: Date.now() - start,
      promptTokenCount: usage?.promptTokenCount ?? null,
      candidatesTokenCount: usage?.candidatesTokenCount ?? null,
      totalTokenCount: usage?.totalTokenCount ?? null,
    });

    return validation.data;
  } catch (error) {
    const normalizedError = normalizeLlmError(error);

    logMetric("LLM_CALL_FAILED", {
      task,
      model,
      latencyMs: Date.now() - start,
      errorCode: normalizedError.code,
      status: normalizedError.status ?? null,
      issueCount: normalizedError.validationIssues?.length || 0,
      promptTokenCount: usage?.promptTokenCount ?? null,
      candidatesTokenCount: usage?.candidatesTokenCount ?? null,
      totalTokenCount: usage?.totalTokenCount ?? null,
    });

    throw normalizedError;
  }
}

function normalizeLlmError(error) {
  if (error.status === 429) {
    const quotaError = new Error("LLM_QUOTA_EXCEEDED");

    quotaError.code = "LLM_QUOTA_EXCEEDED";
    quotaError.status = 429;

    return quotaError;
  }

  if (error.status === 404) {
    const modelError = new Error("LLM_MODEL_UNAVAILABLE");

    modelError.code = "LLM_MODEL_UNAVAILABLE";
    modelError.status = 404;

    return modelError;
  }

  if (typeof error?.code === "string" && error.code.startsWith("LLM_")) {
    return error;
  }

  if ([500, 502, 503, 504].includes(error?.status)) {
    const serviceError = new Error("LLM_SERVICE_UNAVAILABLE");
    serviceError.code = "LLM_SERVICE_UNAVAILABLE";
    serviceError.status = error.status;
    return serviceError;
  }

  const providerError = new Error("LLM_PROVIDER_ERROR");
  providerError.code = "LLM_PROVIDER_ERROR";
  providerError.status = error?.status;

  return providerError;
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
  createLlmService,
};
