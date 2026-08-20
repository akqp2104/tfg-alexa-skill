const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const gameService = require("../services/gameService");
const safetyService = require("../services/safetyService");
const indicatorAnalysisService = require("../services/indicatorAnalysisService");
const narrativeService = require("../services/narrativeService");

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
