const test = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");

const {
  createIndicatorAnalysisService,
} = require("../services/indicatorAnalysisService");
const indicatorAnalysisSchema = require("../schemas/indicatorAnalysisSchema");
const geminiIndicatorSchema = require("../schemas/geminiIndicatorSchema");

test("analyze calls the LLM with the indicator prompt and schemas", async () => {
  const expected = {
    evidence: [
      {
        indicator: "worry",
        scoreDelta: 1,
        evidence: "Evidencia contextual breve",
      },
    ],
  };
  const generate = mock.fn(async () => expected);
  const service = createIndicatorAnalysisService({
    llm: { generate },
  });

  const result = await service.analyze(buildAnalysisInput());

  assert.equal(result, expected);
  assert.equal(generate.mock.callCount(), 1);

  const request = generate.mock.calls[0].arguments[0];
  assert.equal(request.task, "indicator_analysis");
  assert.equal(request.zodSchema, indicatorAnalysisSchema);
  assert.equal(request.responseJsonSchema, geminiIndicatorSchema);
  assert.match(request.prompt, /RESPUESTA: "Esperar"/);
  assert.match(request.prompt, /OPCIÓN RESUELTA: \{"id":"wait"/);
  assert.match(request.prompt, /"scene":"sala de espera"/);
  assert.match(request.prompt, /"characterGoal":"recibir noticias"/);
  assert.match(request.prompt, /"id":"wait","text":"Esperar aquí"/);
  assert.doesNotMatch(request.prompt, /evento antiguo/);
  assert.doesNotMatch(request.prompt, /internalNote/);
  assert.doesNotMatch(request.prompt, /synonyms/);
});

test("analyze propagates LLM errors", async () => {
  const llmError = new Error("LLM_SCHEMA_INVALID");
  llmError.code = "LLM_SCHEMA_INVALID";
  const service = createIndicatorAnalysisService({
    llm: {
      generate: async () => {
        throw llmError;
      },
    },
  });

  await assert.rejects(service.analyze(buildAnalysisInput()), (error) => {
    assert.equal(error, llmError);
    assert.equal(error.code, "LLM_SCHEMA_INVALID");
    return true;
  });
});

function buildAnalysisInput() {
  return {
    userInput: {
      rawText: "Esperar",
      resolvedChoice: { id: "wait", name: "Esperar aquí" },
    },
    narrativeState: {
      scene: "sala de espera",
      characterGoal: "recibir noticias",
      recentEvents: [
        "evento antiguo",
        "llegada",
        "conversación",
        "espera",
      ],
      internalNote: "no debe llegar al prompt",
    },
    currentChoices: [
      {
        id: "wait",
        text: "Esperar aquí",
        synonyms: ["quedarse"],
      },
      {
        id: "leave",
        text: "Salir de la sala",
        synonyms: ["salir"],
      },
    ],
  };
}
