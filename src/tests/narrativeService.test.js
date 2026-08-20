const test = require("node:test");
const assert = require("node:assert/strict");

const llmService = require("../services/llmService");
const narrativeService = require("../services/narrativeService");
const createInitialGameState = require("../state/createInitialGameState");

test("normalizes harmless size excesses before strict validation", () => {
  const normalized = narrativeService.normalizeNarrativeCandidate({
    narrative: `  ${"a".repeat(1100)}  `,
    reprompt: " pregunta ",
    choices: [
      {
        id: "choice",
        text: "b".repeat(140),
        synonyms: ["one", "two", "three", "four", "five", "six"],
      },
    ],
    narrativeStateUpdate: {
      recentEvents: ["1", "2", "3", "4", "5", "6"],
    },
  });

  assert.equal(normalized.narrative.length, 1000);
  assert.equal(normalized.choices[0].text.length, 120);
  assert.equal(normalized.choices[0].synonyms.length, 5);
  assert.equal(normalized.narrativeStateUpdate.recentEvents.length, 5);
});

test("the narrative retry tells Gemini what must be corrected", async () => {
  const originalGenerate = llmService.generate;
  const prompts = [];
  const validResult = {
    narrative: "Escena",
    reprompt: "Pregunta",
    choices: [],
    narrativeStateUpdate: {},
  };

  llmService.generate = async ({ prompt }) => {
    prompts.push(prompt);

    if (prompts.length === 1) {
      const error = new Error("LLM_SCHEMA_INVALID");
      error.code = "LLM_SCHEMA_INVALID";
      error.validationIssues = [{ path: "choices", code: "too_small" }];
      throw error;
    }

    return validResult;
  };

  try {
    const result = await narrativeService.generateInitialScene(
      createInitialGameState("retry"),
      {},
    );

    assert.equal(result, validResult);
    assert.equal(prompts.length, 2);
    assert.match(prompts[1], /CORRECCIÓN OBLIGATORIA/);
    assert.match(prompts[1], /choices/);
  } finally {
    llmService.generate = originalGenerate;
  }
});

test("does not retry when the Alexa response deadline is exhausted", async () => {
  const originalGenerate = llmService.generate;
  let attempts = 0;

  llmService.generate = async () => {
    attempts += 1;
    const error = new Error("LLM_SCHEMA_INVALID");
    error.code = "LLM_SCHEMA_INVALID";
    throw error;
  };

  try {
    await assert.rejects(
      narrativeService.generateInitialScene(
        createInitialGameState("expired-deadline"),
        {},
        { deadlineAt: Date.now() },
      ),
      /LLM_SCHEMA_INVALID/,
    );
    assert.equal(attempts, 1);
  } finally {
    llmService.generate = originalGenerate;
  }
});
