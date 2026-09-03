const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const gameService = require("../services/gameService");
const safetyService = require("../services/safetyService");
const indicatorAnalysisService = require("../services/indicatorAnalysisService");
const narrativeService = require("../services/narrativeService");
const narrativeSummaryService = require("../services/narrativeSummaryService");
const progressConfig = require("../config/progressConfig");

test("a failed narrative generation does not partially mutate game state", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("test");
  gameState.turn = 1;
  gameState.currentChoices = [{ id: "rest", text: "Descansar" }];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({
    evidence: [
      {
        indicator: "lowEnergy",
        scoreDelta: 2,
        evidence: "Elige descansar por cansancio.",
      },
    ],
  });
  narrativeService.generateNextScene = async () => {
    throw new Error("NARRATIVE_FAILED");
  };

  try {
    await assert.rejects(
      gameService.processTurn(gameState, {
        rawText: "Descansar",
        resolvedChoice: { id: "rest", name: "Descansar" },
      }),
      /NARRATIVE_FAILED/,
    );

    assert.equal(gameState.indicators.lowEnergy.score, 0);
    assert.equal(gameState.indicators.lowEnergy.evidenceCount, 0);
    assert.equal(gameState.lastFocus, null);
    assert.equal(gameState.turn, 1);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("a narrative LLM failure preserves the game and offers previous choices", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("test-recovery");
  gameState.turn = 3;
  gameState.currentChoices = [
    { id: "talk", text: "Hablar con Marta", synonyms: ["hablar"] },
    { id: "leave", text: "Salir del local", synonyms: ["salir"] },
  ];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => {
    const error = new Error("LLM_SCHEMA_INVALID");
    error.code = "LLM_SCHEMA_INVALID";
    throw error;
  };

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Hablar con Marta",
      resolvedChoice: { id: "talk", name: "Hablar con Marta" },
    });

    assert.equal(result.gameState, gameState);
    assert.equal(result.gameState.turn, 3);
    assert.equal(result.recoveredFromNarrativeError, true);
    assert.equal(result.shouldEndSession, false);
    assert.match(result.response, /Hablar con Marta/);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("a retryable Gemini service failure also preserves the game", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("service-recovery");
  gameState.turn = 2;
  gameState.currentChoices = [
    { id: "talk", text: "Hablar", synonyms: [] },
    { id: "wait", text: "Esperar", synonyms: [] },
  ];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => {
    const error = new Error("Service unavailable");
    error.status = 503;
    throw error;
  };

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Esperar",
      resolvedChoice: { id: "wait", name: "Esperar" },
    });

    assert.equal(result.gameState, gameState);
    assert.equal(result.recoveredFromNarrativeError, true);
    assert.equal(result.shouldEndSession, false);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("an initial narrative LLM failure uses a valid local scene", async () => {
  const originalGenerateInitialScene = narrativeService.generateInitialScene;
  narrativeService.generateInitialScene = async () => {
    const error = new Error("LLM_SCHEMA_INVALID");
    error.code = "LLM_SCHEMA_INVALID";
    throw error;
  };

  try {
    const result = await gameService.startGame(
      createInitialGameState("test-initial-fallback"),
    );

    assert.equal(result.gameState.turn, 1);
    assert.equal(result.gameState.currentChoices.length, 2);
    assert.equal(result.shouldEndSession, false);
    assert.match(result.response, /Tus opciones son/);
  } finally {
    narrativeService.generateInitialScene = originalGenerateInitialScene;
  }
});

test("the periodic summary is stored in the returned game state", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const originalUpdateSummary = narrativeSummaryService.updateSummary;
  const gameState = createInitialGameState("summary");
  gameState.turn = 3;
  gameState.currentChoices = [{ id: "wait", text: "Esperar", synonyms: [] }];
  gameState.narrativeState.recentEvents = ["evento 1", "evento 2"];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => ({
    narrative: "La situación continúa.",
    reprompt: "¿Qué haces?",
    choices: [
      { id: "talk", text: "Hablar con calma", synonyms: ["hablar con calma"] },
      { id: "leave", text: "Alejarse un momento", synonyms: ["alejarse"] },
    ],
    narrativeStateUpdate: {
      scene: "continuación",
      recentEvents: ["evento 3", "evento 4"],
    },
  });
  narrativeSummaryService.updateSummary = async (state) => {
    assert.equal(state.turn, 4);
    assert.deepEqual(state.narrativeState.recentEvents, [
      "evento 1",
      "evento 2",
      "evento 3",
      "evento 4",
    ]);
    return "Resumen consolidado";
  };

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Esperar",
      resolvedChoice: { id: "wait", name: "Esperar" },
    });

    assert.equal(result.gameState.turn, 4);
    assert.equal(result.gameState.narrativeSummary, "Resumen consolidado");
    assert.deepEqual(result.gameState.narrativeState.recentEvents, [
      "evento 3",
      "evento 4",
    ]);
    assert.equal(gameState.narrativeSummary, "");
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
    narrativeSummaryService.updateSummary = originalUpdateSummary;
  }
});

test("a summary LLM failure does not interrupt the completed turn", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const originalUpdateSummary = narrativeSummaryService.updateSummary;
  const gameState = createInitialGameState("summary-failure");
  gameState.turn = 3;
  gameState.currentChoices = [{ id: "wait", text: "Esperar", synonyms: [] }];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => ({
    narrative: "La situación continúa.",
    reprompt: "¿Qué haces?",
    choices: [
      { id: "talk", text: "Hablar con calma", synonyms: [] },
      { id: "wait", text: "Esperar un poco", synonyms: [] },
    ],
    narrativeStateUpdate: { scene: "continuación", recentEvents: ["evento"] },
  });
  narrativeSummaryService.updateSummary = async () => {
    const error = new Error("LLM_SCHEMA_INVALID");
    error.code = "LLM_SCHEMA_INVALID";
    throw error;
  };

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Esperar",
      resolvedChoice: { id: "wait", name: "Esperar" },
    });

    assert.equal(result.gameState.turn, 4);
    assert.equal(result.shouldEndSession, false);
    assert.deepEqual(result.gameState.narrativeState.recentEvents, ["evento"]);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
    narrativeSummaryService.updateSummary = originalUpdateSummary;
  }
});

test("resolution continues until Gemini marks the story as complete", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("resolution-not-complete");
  gameState.turn = 12;
  gameState.narrativeState.storyProgress = "resolution";
  gameState.currentChoices = [{ id: "continue", text: "Continuar", synonyms: [] }];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => ({
    narrative: "Todavía queda una conversación pendiente.",
    reprompt: "¿Qué haces?",
    storyComplete: false,
    choices: [
      { id: "talk", text: "Hablar con Marta", synonyms: [] },
      { id: "wait", text: "Esperar un momento", synonyms: [] },
    ],
    narrativeStateUpdate: {
      storyProgress: "resolution",
      recentEvents: ["La conversación sigue pendiente"],
    },
  });

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Continuar",
      resolvedChoice: { id: "continue", name: "Continuar" },
    });

    assert.equal(result.shouldEndSession, false);
    assert.equal(result.gameState.narrativeState.storyComplete, false);
    assert.equal(result.gameState.currentChoices.length, 2);
    assert.match(result.response, /Tus opciones son/);
    assert.match(result.reprompt, /Hablar con Marta/);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("a safety result redirects before indicator and narrative generation", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("safety-redirect");
  gameState.turn = 2;
  let indicatorCalled = false;
  let narrativeCalled = false;

  safetyService.analyze = async () => ({
    state: "UNCERTAIN",
    riskTarget: "UNKNOWN",
  });
  indicatorAnalysisService.analyze = async () => {
    indicatorCalled = true;
    return { evidence: [] };
  };
  narrativeService.generateNextScene = async () => {
    narrativeCalled = true;
  };

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "No está claro",
      resolvedChoice: null,
    });

    assert.equal(result.shouldEndSession, false);
    assert.equal(result.gameState.safetyState.phase, "OPEN_SAFETY_CHECK");
    assert.equal(indicatorCalled, false);
    assert.equal(narrativeCalled, false);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("the backend does not accept a premature final scene without choices", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("premature-ending");
  gameState.turn = 4;
  gameState.narrativeState.storyProgress = "development";
  gameState.currentChoices = [
    { id: "continue", text: "Continuar", synonyms: [] },
    { id: "wait", text: "Esperar", synonyms: [] },
  ];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => ({
    narrative: "Final prematuro.",
    reprompt: "",
    storyComplete: true,
    choices: [],
    narrativeStateUpdate: {
      storyProgress: "resolution",
      recentEvents: ["Final prematuro"],
    },
  });

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Continuar",
      resolvedChoice: { id: "continue", name: "Continuar" },
    });

    assert.equal(result.recoveredFromNarrativeError, true);
    assert.equal(result.gameState, gameState);
    assert.equal(result.gameState.narrativeState.storyProgress, "development");
    assert.equal(result.gameState.currentChoices.length, 2);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("story progress calculated by the backend cannot be overwritten by Gemini", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("authoritative-progress");
  gameState.turn = 1;
  gameState.currentChoices = [{ id: "continue", text: "Continuar", synonyms: [] }];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => ({
    narrative: "La historia sigue.",
    reprompt: "¿Qué haces?",
    storyComplete: false,
    choices: [
      { id: "talk", text: "Hablar", synonyms: [] },
      { id: "wait", text: "Esperar", synonyms: [] },
    ],
    narrativeStateUpdate: {
      storyProgress: "resolution",
      recentEvents: ["La historia sigue"],
    },
  });

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Continuar",
      resolvedChoice: { id: "continue", name: "Continuar" },
    });

    assert.equal(result.gameState.narrativeState.storyProgress, "introduction");
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("Gemini storyComplete closes the game without offering more choices", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("completed-story");
  gameState.turn = 13;
  gameState.narrativeState.storyProgress = "resolution";
  gameState.currentChoices = [{ id: "talk", text: "Hablar", synonyms: [] }];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async () => ({
    narrative: "Os despedís y vuelves a casa con el asunto resuelto.",
    reprompt: "",
    storyComplete: true,
    choices: [],
    narrativeStateUpdate: {
      storyProgress: "resolution",
      recentEvents: ["La historia termina con el conflicto resuelto"],
    },
  });

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Hablar",
      resolvedChoice: { id: "talk", name: "Hablar" },
    });

    assert.equal(result.shouldEndSession, true);
    assert.equal(result.reprompt, undefined);
    assert.equal(result.gameState.narrativeState.storyComplete, true);
    assert.deepEqual(result.gameState.currentChoices, []);
    assert.doesNotMatch(result.response, /Tus opciones son/);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});

test("the hard limit requests and accepts a final resolution", async () => {
  const originalSafetyAnalyze = safetyService.analyze;
  const originalIndicatorAnalyze = indicatorAnalysisService.analyze;
  const originalGenerateNextScene = narrativeService.generateNextScene;
  const gameState = createInitialGameState("forced-ending");
  gameState.turn = progressConfig.maxTurns;
  gameState.narrativeState.storyProgress = "development";
  gameState.currentChoices = [{ id: "continue", text: "Continuar", synonyms: [] }];

  safetyService.analyze = async () => ({ state: "NORMAL", riskTarget: "NONE" });
  indicatorAnalysisService.analyze = async () => ({ evidence: [] });
  narrativeService.generateNextScene = async (state, input, focus, options) => {
    assert.equal(state.narrativeState.storyProgress, "resolution");
    assert.equal(focus, null);
    assert.equal(options.forceEnding, true);
    assert.equal(Number.isFinite(options.deadlineAt), true);

    return {
      narrative: "La historia concluye.",
      reprompt: "",
      storyComplete: true,
      choices: [],
      narrativeStateUpdate: {
        storyProgress: "resolution",
        recentEvents: ["La historia concluye"],
      },
    };
  };

  try {
    const result = await gameService.processTurn(gameState, {
      rawText: "Continuar",
      resolvedChoice: { id: "continue", name: "Continuar" },
    });

    assert.equal(result.shouldEndSession, true);
    assert.equal(result.gameState.narrativeState.storyProgress, "resolution");
    assert.equal(result.gameState.narrativeState.storyComplete, true);
  } finally {
    safetyService.analyze = originalSafetyAnalyze;
    indicatorAnalysisService.analyze = originalIndicatorAnalyze;
    narrativeService.generateNextScene = originalGenerateNextScene;
  }
});
