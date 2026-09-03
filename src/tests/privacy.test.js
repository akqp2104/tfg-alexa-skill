const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const sessionService = require("../services/sessionService");
const { sanitizeError } = require("../services/errorSanitizationService");
const gameService = require("../services/gameService");
const safetyService = require("../services/safetyService");
const indicatorAnalysisService = require("../services/indicatorAnalysisService");
const narrativeService = require("../services/narrativeService");
const narrativeResponseSchema = require("../schemas/narrativeResponseSchema");
const safetyResponseSchema = require("../schemas/safetyResponseSchema");
const { buildIndicatorPrompt } = require("../prompts/indicatorPrompt");
const { buildSummaryPrompt } = require("../prompts/summaryPrompt");

function createAttributesManager(initial = {}) {
  let attributes = initial;

  return {
    getSessionAttributes() {
      return attributes;
    },
    setSessionAttributes(nextAttributes) {
      attributes = nextAttributes;
    },
    getPersistentAttributes() {
      throw new Error("Persistent attributes must not be used");
    },
  };
}

test("game state uses session attributes without persistent storage", () => {
  const attributesManager = createAttributesManager();
  const handlerInput = { attributesManager };
  const state = createInitialGameState("private-session");

  sessionService.saveGameState(handlerInput, state);
  assert.equal(sessionService.getGameState(handlerInput), state);

});

test("game state contains no Alexa identifiers or conversation history", () => {
  const state = createInitialGameState("ignored-session-id");

  assert.equal("sessionId" in state, false);
  assert.equal("userId" in state, false);
  assert.equal("deviceId" in state, false);
  assert.equal("personId" in state, false);
  assert.equal("responses" in state, false);
  assert.equal("history" in state, false);
  assert.deepEqual(state.narrativeState.recentEvents, []);
  assert.equal(state.narrativeSummary, "");
});

test("error sanitization excludes stacks and limits provider messages", () => {
  const error = new Error("sensitive-provider-fragment-" + "x".repeat(500));
  error.code = "PROVIDER_ERROR";
  error.status = 500;

  const sanitized = sanitizeError(error);

  assert.deepEqual(Object.keys(sanitized), ["name", "code", "status", "message"]);
  assert.equal(sanitized.message.length, 300);
  assert.equal("stack" in sanitized, false);
});

test("TURN_FAILED logs only a sanitized error object", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalConsoleError = console.error;
  const loggedErrors = [];
  const state = createInitialGameState("sanitized-log");

  safetyService.analyze = async () => {
    const error = new Error("provider-detail-" + "x".repeat(500));
    error.status = 418;
    throw error;
  };
  console.error = (...args) => loggedErrors.push(args);

  try {
    await assert.rejects(
      gameService.processTurn(state, {
        rawText: "sensitive user phrase",
        resolvedChoice: null,
      }),
      /provider-detail/,
    );

    const [, metadata] = loggedErrors.find(([event]) => event === "TURN_FAILED");
    assert.equal(metadata.stage, "safety");
    assert.equal(metadata.error.message.length, 300);
    assert.equal("stack" in metadata.error, false);
    assert.equal(JSON.stringify(metadata).includes("sensitive user phrase"), false);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    console.error = originalConsoleError;
  }
});

test("game logs omit safety classifications and indicator results", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const originalConsoleLog = console.log;
  const loggedEntries = [];
  const state = createInitialGameState("minimal-logs");
  state.turn = 12;
  state.narrativeState.storyProgress = "resolution";
  state.currentChoices = [{ id: "continue", text: "Continuar", synonyms: [] }];
  state.indicators.worry = {
    score: 2,
    evidenceCount: 1,
    focusCount: 2,
  };

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({
    evidence: [
      {
        indicator: "worry",
        scoreDelta: 2,
        evidence: "Contenido temporal que no debe registrarse",
      },
    ],
  });
  narrativeService.generateNextScene = async () => ({
    narrative: "La historia termina.",
    reprompt: "",
    storyComplete: true,
    choices: [],
    narrativeStateUpdate: {
      recentEvents: ["El conflicto ficticio queda resuelto"],
    },
  });
  console.log = (...args) => loggedEntries.push(args);

  try {
    await gameService.processTurn(state, {
      rawText: "Respuesta privada",
      resolvedChoice: { id: "continue", name: "Continuar" },
    });

    safetyService.analyze = async () => ({
      state: "UNCERTAIN",
      riskTarget: "UNKNOWN",
    });
    await gameService.processTurn(createInitialGameState(), {
      rawText: "Otra respuesta privada",
      resolvedChoice: null,
    });

    const serializedLogs = JSON.stringify(loggedEntries);
    assert.doesNotMatch(serializedLogs, /worry|moderate|SAFETY_TRIGGERED/);
    assert.doesNotMatch(serializedLogs, /NORMAL|UNCERTAIN|UNKNOWN/);
    assert.doesNotMatch(serializedLogs, /Respuesta privada|Contenido temporal/);

    assert.deepEqual(findLogMetadata(loggedEntries, "INDICATORS_UPDATED"), {
      turn: 12,
      updated: true,
    });
    assert.deepEqual(findLogMetadata(loggedEntries, "FINAL_EVALUATION_CREATED"), {
      turn: 13,
      created: true,
    });
    assert.deepEqual(findLogMetadata(loggedEntries, "TURN_SAFETY_REDIRECT"), {
      turn: 0,
      redirected: true,
    });
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
    console.log = originalConsoleLog;
  }
});

test("narrative state rejects fields about the real user", () => {
  const response = {
    narrative: "La escena continúa.",
    reprompt: "¿Qué haces?",
    storyComplete: false,
    choices: [
      { id: "talk", text: "Hablar", synonyms: [] },
      { id: "wait", text: "Esperar", synonyms: [] },
    ],
    narrativeStateUpdate: {
      scene: "oficina",
      location: "oficina ficticia",
      timeOfDay: null,
      characterEmotion: { primary: "neutral", intensity: 0 },
      characterGoal: null,
      relationships: {},
      openConflicts: [],
      commitments: [],
      recentEvents: [],
      storyProgress: "development",
      realUserName: "Sensitive Name",
    },
  };

  assert.equal(narrativeResponseSchema.safeParse(response).success, false);
});

test("safety results keep only classification fields", () => {
  const parsed = safetyResponseSchema.parse({
    state: "UNCERTAIN",
    riskTarget: "UNKNOWN",
    reason: "A copied personal phrase",
  });

  assert.deepEqual(parsed, {
    state: "UNCERTAIN",
    riskTarget: "UNKNOWN",
  });
});

test("indicator and summary prompts prohibit retaining identifiers", () => {
  const indicatorPrompt = buildIndicatorPrompt({
    userInput: { rawText: "respuesta", resolvedChoice: null },
    narrativeState: {},
    currentChoices: [],
  });
  const summaryPrompt = buildSummaryPrompt({
    previousSummary: "",
    narrativeState: {},
  });

  assert.match(indicatorPrompt, /nombres, direcciones, teléfonos/);
  assert.match(indicatorPrompt, /No conserves información personal/);
  assert.match(summaryPrompt, /únicamente acontecimientos de la ficción/);
  assert.match(
    summaryPrompt,
    /datos personales proporcionados accidentalmente/,
  );
});

function findLogMetadata(entries, event) {
  return entries.find(([loggedEvent]) => loggedEvent === event)?.[1];
}
