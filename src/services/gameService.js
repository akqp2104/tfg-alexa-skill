const narrativeService = require("./narrativeService");
const storySeedService = require("./storySeedService");
const safetyService = require("./safetyService");
const safetyFlowService = require("./safetyFlowService");
const indicatorAnalysisService = require("./indicatorAnalysisService");
const indicatorService = require("./indicatorService");

async function startGame(gameState) {
  console.log("START GAME");

  const storySeed = storySeedService.generateStorySeed();
  const generated = await narrativeService.generateInitialScene(
    gameState,
    storySeed,
  );

  applyNarrativeStateUpdate(gameState, generated.narrativeStateUpdate);

  gameState.currentChoices = generated.choices;

  gameState.turn = 1;

  console.log("INITIAL GAME STATE:", {
    turn: gameState.turn,
    choiceCount: gameState.currentChoices.length,
  });

  return {
    gameState,
    response: generated.narrative,
    reprompt: generated.reprompt,
    shouldEndSession: false,
  };
}

async function processTurn(gameState, userInput) {
  // 1. Analizar la entrada del usuario para detectar posibles riesgos de seguridad.
  const safetyResult = await safetyService.analyze({
    userInput,
    narrativeState: gameState.narrativeState,
    currentChoices: gameState.currentChoices,
  });

  console.log("SAFETY RESULT:", {
    state: safetyResult.state,
    riskTarget: safetyResult.riskTarget,
  });

  if (safetyResult.state === "UNCERTAIN") {
    return safetyFlowService.handleUncertain(gameState);
  }

  if (safetyResult.state === "SAFETY_TRIGGERED") {
    return safetyFlowService.handleSafetyTriggered(
      gameState,
      safetyResult.riskTarget,
    );
  }

  gameState.safetyState = {
    state: "NORMAL",
    phase: null,
    awaitingImmediateSafetyAnswer: false,
  };

  // 2. Analizar la entrada del usuario para actualizar los indicadores.
  const indicatorAnalysis = await indicatorAnalysisService.analyze({
    userInput,
    narrativeState: gameState.narrativeState,
    currentChoices: gameState.currentChoices,
  });

  console.log(
    "INDICATOR ANALYSIS:",
    JSON.stringify(indicatorAnalysis, null, 2),
  );

  // 3. Actualizar los indicadores en el estado del juego.
  indicatorService.applyEvidence(gameState.indicators, indicatorAnalysis);

  console.log(
    "UPDATED INDICATORS:",
    JSON.stringify(gameState.indicators, null, 2),
  );

  // 4. Generar la siguiente escena narrativa basada en la entrada del usuario y el estado actualizado del juego.
  console.log("PROCESS TURN:", {
    turn: gameState.turn,
  });

  const generated = await narrativeService.generateNextScene(
    gameState,
    userInput,
  );

  applyNarrativeStateUpdate(gameState, generated.narrativeStateUpdate);

  gameState.currentChoices = generated.choices;

  gameState.turn += 1;

  console.log("UPDATED GAME STATE:", {
    turn: gameState.turn,
    choiceCount: gameState.currentChoices.length,
  });

  return {
    gameState,
    response: generated.narrative,
    reprompt: generated.reprompt,
    shouldEndSession: false,
  };
}

function applyNarrativeStateUpdate(gameState, update) {
  gameState.narrativeState = {
    ...gameState.narrativeState,
    ...update,
  };
}

module.exports = {
  startGame,
  processTurn,
};
