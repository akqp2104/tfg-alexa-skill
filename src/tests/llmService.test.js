const test = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");
const { z } = require("zod");

const { createLlmService } = require("../services/llmService");

const responseSchema = z.object({
  value: z.string(),
});

test.afterEach(() => {
  mock.restoreAll();
});

test("invalid JSON produces LLM_INVALID_JSON", async () => {
  silenceLogs();
  const service = buildService({ text: "not valid JSON" });

  await assert.rejects(
    service.generate(buildRequest()),
    (error) => error.code === "LLM_INVALID_JSON",
  );
});

test("a Zod-invalid response produces LLM_SCHEMA_INVALID", async () => {
  silenceLogs();
  const service = buildService({ text: JSON.stringify({ value: 42 }) });

  await assert.rejects(service.generate(buildRequest()), (error) => {
    assert.equal(error.code, "LLM_SCHEMA_INVALID");
    assert.ok(error.validationIssues.length > 0);
    assert.equal(error.validationIssues[0].path, "value");
    return true;
  });
});

test("a semantic-invalid response produces LLM_SEMANTIC_INVALID", async () => {
  silenceLogs();
  const service = buildService({ text: JSON.stringify({ value: "valid" }) });

  await assert.rejects(
    service.generate({
      ...buildRequest(),
      semanticValidator: () => ({
        valid: false,
        reason: "VALUE_NOT_ALLOWED",
      }),
    }),
    (error) => {
      assert.equal(error.code, "LLM_SEMANTIC_INVALID");
      assert.equal(error.reason, "VALUE_NOT_ALLOWED");
      return true;
    },
  );
});

test("a valid response returns the validated object", async () => {
  silenceLogs();
  const generateContent = mock.fn(async () => ({
    text: JSON.stringify({ value: "accepted" }),
  }));
  const service = buildServiceWithGenerate(generateContent);

  const result = await service.generate(buildRequest());

  assert.deepEqual(result, { value: "accepted" });
  assert.equal(generateContent.mock.callCount(), 1);
  assert.deepEqual(generateContent.mock.calls[0].arguments[0], {
    model: "test-model",
    contents: "test prompt",
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: { type: "object" },
      maxOutputTokens: 123,
    },
  });
});

test("usage metadata is included in the success log", async () => {
  const log = mock.method(console, "log", () => {});
  mock.method(console, "error", () => {});
  const service = buildService({
    text: JSON.stringify({ value: "accepted" }),
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      totalTokenCount: 15,
    },
  });

  await service.generate(buildRequest());

  assert.equal(log.mock.callCount(), 1);
  const metric = JSON.parse(log.mock.calls[0].arguments[0]);
  assert.deepEqual(metric, {
    event: "LLM_CALL_SUCCESS",
    timestamp: metric.timestamp,
    task: "test_task",
    model: "test-model",
    latencyMs: metric.latencyMs,
    promptTokenCount: 10,
    candidatesTokenCount: 5,
    totalTokenCount: 15,
  });
  assert.equal(typeof metric.latencyMs, "number");
});

function buildService(response) {
  return buildServiceWithGenerate(async () => response);
}

function buildServiceWithGenerate(generateContent) {
  return createLlmService({
    client: {
      models: { generateContent },
    },
    model: "test-model",
  });
}

function buildRequest() {
  return {
    prompt: "test prompt",
    responseJsonSchema: { type: "object" },
    zodSchema: responseSchema,
    task: "test_task",
    maxOutputTokens: 123,
  };
}

function silenceLogs() {
  mock.method(console, "log", () => {});
  mock.method(console, "error", () => {});
}
