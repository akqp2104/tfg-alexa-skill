const test = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");

const { createLlmService } = require("../services/llmService");
const { createSafetyService } = require("../services/safetyService");
const geminiSafetySchema = require("../schemas/geminiSafetySchema");

const safetyCases = [
  { state: "NORMAL", riskTarget: "NONE" },
  { state: "UNCERTAIN", riskTarget: "UNKNOWN" },
  { state: "SAFETY_TRIGGERED", riskTarget: "SELF" },
  { state: "SAFETY_TRIGGERED", riskTarget: "OTHERS" },
];

test.afterEach(() => {
  mock.restoreAll();
});

for (const expected of safetyCases) {
  test(`analyze returns ${expected.state} with ${expected.riskTarget}`, async () => {
    silenceLogs();
    const { service } = buildSafetyService({
      text: JSON.stringify(expected),
    });

    const result = await service.analyze(buildAnalysisInput());

    assert.deepEqual(result, expected);
  });
}

test("analyze connects the safety prompt and schema to the LLM", async () => {
  silenceLogs();
  const { service, generateContent } = buildSafetyService({
    text: JSON.stringify({ state: "NORMAL", riskTarget: "NONE" }),
  });

  await service.analyze(buildAnalysisInput());

  assert.equal(generateContent.mock.callCount(), 1);
  const request = generateContent.mock.calls[0].arguments[0];
  assert.equal(request.model, "test-model");
  assert.match(request.contents, /MENSAJE: "Continuar"/);
  assert.match(request.contents, /CONTEXTO FICTICIO MÍNIMO/);
  assert.deepEqual(request.config.responseJsonSchema, geminiSafetySchema);
});

test("analyze propagates a normalized LLM error", async () => {
  silenceLogs();
  const { service } = buildSafetyServiceError({ status: 503 });

  await assert.rejects(
    service.analyze(buildAnalysisInput()),
    (error) =>
      error.code === "LLM_SERVICE_UNAVAILABLE" && error.status === 503,
  );
});

test("analyze rejects a structurally invalid response", async () => {
  silenceLogs();
  const { service } = buildSafetyService({
    text: JSON.stringify({ state: "NORMAL" }),
  });

  await assert.rejects(
    service.analyze(buildAnalysisInput()),
    (error) => error.code === "LLM_SCHEMA_INVALID",
  );
});

function buildAnalysisInput() {
  return {
    userInput: {
      rawText: "Continuar",
      resolvedChoice: { id: "continue", name: "Continuar" },
    },
    narrativeState: {
      scene: "Una conversación ficticia",
      recentEvents: ["El personaje espera una respuesta"],
    },
    currentChoices: [
      { id: "continue", text: "Continuar la conversación", synonyms: [] },
    ],
  };
}

function buildSafetyService(response) {
  const generateContent = mock.fn(async () => response);
  return buildWithGenerateContent(generateContent);
}

function buildSafetyServiceError(error) {
  const generateContent = mock.fn(async () => {
    throw error;
  });
  return buildWithGenerateContent(generateContent);
}

function buildWithGenerateContent(generateContent) {
  const llm = createLlmService({
    client: { models: { generateContent } },
    model: "test-model",
  });

  return {
    service: createSafetyService({ llm }),
    generateContent,
  };
}

function silenceLogs() {
  mock.method(console, "log", () => {});
  mock.method(console, "error", () => {});
}
