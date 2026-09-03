const test = require("node:test");
const assert = require("node:assert/strict");

const llmService = require("../services/llmService");
const narrativeService = require("../services/narrativeService");
const createInitialGameState = require("../state/createInitialGameState");
const narrativeResponseSchema = require("../schemas/narrativeResponseSchema");
const {
  validateNarrativeSemantics,
} = require("../validators/narrativeValidator");

test("storyComplete is false in the initial game state", () => {
  assert.equal(
    createInitialGameState("story-complete").narrativeState.storyComplete,
    false,
  );
});

test("only a completed resolution can omit choices", () => {
  const completed = {
    narrative: "La historia llega a su fin.",
    reprompt: "",
    storyComplete: true,
    choices: [],
    narrativeStateUpdate: {
      scene: "final",
      location: null,
      timeOfDay: null,
      characterEmotion: { primary: "calma", intensity: 1 },
      characterGoal: null,
      relationships: {},
      openConflicts: [],
      commitments: [],
      recentEvents: ["El conflicto queda resuelto"],
      storyProgress: "resolution",
    },
  };

  assert.equal(narrativeResponseSchema.safeParse(completed).success, true);
  assert.deepEqual(validateNarrativeSemantics(completed), { valid: true });

  completed.storyComplete = false;
  const incompleteValidation = narrativeResponseSchema.safeParse(completed);
  assert.equal(incompleteValidation.success, false);
  assert.equal(
    incompleteValidation.error.issues[0].message,
    "A non-final scene must provide at least 2 choices",
  );

  completed.storyComplete = true;
  completed.choices = [
    { id: "continue", text: "Continuar", synonyms: ["seguir"] },
  ];
  const finalWithChoicesValidation =
    narrativeResponseSchema.safeParse(completed);
  assert.equal(finalWithChoicesValidation.success, false);
  assert.equal(
    finalWithChoicesValidation.error.issues[0].message,
    "A final scene must not provide choices",
  );
});

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

test("keeps conflicting Alexa commands inside complete choice phrases", () => {
  const normalized = narrativeService.normalizeNarrativeCandidate({
    choices: [
      {
        id: "call",
        text: "llamar",
        synonyms: ["llamar", "llamar a Marta", "contactar con Marta"],
      },
    ],
  });

  assert.equal(normalized.choices[0].text, "Elegir llamar");
  assert.deepEqual(normalized.choices[0].synonyms, [
    "llamar a Marta",
    "contactar con Marta",
  ]);
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

test("the initial scene rejects a completed story and retries", async () => {
  const originalGenerate = llmService.generate;
  let attempts = 0;

  llmService.generate = async ({ semanticValidator }) => {
    attempts += 1;
    const candidate = {
      storyComplete: attempts === 1,
      choices: [],
      narrativeStateUpdate: { storyProgress: "resolution" },
    };
    const validation = semanticValidator(candidate);

    if (!validation.valid) {
      const error = new Error("LLM_SEMANTIC_INVALID");
      error.code = "LLM_SEMANTIC_INVALID";
      error.reason = validation.reason;
      throw error;
    }

    return candidate;
  };

  try {
    const result = await narrativeService.generateInitialScene(
      createInitialGameState("initial-not-complete"),
      {},
    );

    assert.equal(attempts, 2);
    assert.equal(result.storyComplete, false);
  } finally {
    llmService.generate = originalGenerate;
  }
});

test("a forced ending rejects an incomplete scene and retries", async () => {
  const originalGenerate = llmService.generate;
  let attempts = 0;

  llmService.generate = async ({ semanticValidator }) => {
    attempts += 1;
    const candidate = {
      storyComplete: attempts > 1,
      choices: [],
      narrativeStateUpdate: { storyProgress: "resolution" },
    };
    const validation = semanticValidator(candidate);

    if (!validation.valid) {
      const error = new Error("LLM_SEMANTIC_INVALID");
      error.code = "LLM_SEMANTIC_INVALID";
      error.reason = validation.reason;
      throw error;
    }

    return candidate;
  };

  try {
    const result = await narrativeService.generateNextScene(
      createInitialGameState("forced-complete"),
      { rawText: "Continuar" },
      null,
      { forceEnding: true },
    );

    assert.equal(attempts, 2);
    assert.equal(result.storyComplete, true);
  } finally {
    llmService.generate = originalGenerate;
  }
});
