const narrativeService = require("./narrativeService");
const storySeedService = require("./storySeedService");
const safetyService = require("./safetyService");
const safetyFlowService = require("./safetyFlowService");
const indicatorAnalysisService = require("./indicatorAnalysisService");
const indicatorService = require("./indicatorService");
const narrativeSpeechService = require("./narrativeSpeechService");
const focusService = require("./focusService");
const llmErrorService = require("./llmErrorService");

const RESPONSE_DEADLINE_MS = 7500;

async function startGame(gameState) {
  const start = Date.now();
  console.log("START GAME");

  const storySeed = storySeedService.generateStorySeed();
  let generated;

  try {
    generated = await narrativeService.generateInitialScene(
      gameState,
      storySeed,
      { deadlineAt: start + RESPONSE_DEADLINE_MS },
    );
  } catch (error) {
    if (!llmErrorService.isLlmError(error)) {
      throw error;
    }

    console.error("NARRATIVE FALLBACK USED:", {
      phase: "initial",
      code: error.code,
    });
    generated = buildInitialNarrativeFallback();
  }

  applyNarrativeStateUpdate(gameState, generated.narrativeStateUpdate);

  gameState.currentChoices = generated.choices;

  gameState.turn = 1;

  logTurnLatency({
    turn: gameState.turn,
    safetyAnalysisMs: null,
    indicatorAnalysisMs: null,
    narrativeGenerationMs: Date.now() - start,
    totalMs: Date.now() - start,
  });

  console.log("INITIAL GAME STATE:", {
    turn: gameState.turn,
    choiceCount: gameState.currentChoices.length,
  });

  return {
    gameState,
    response: narrativeSpeechService.buildResponse(
      generated.narrative,
      generated.choices,
    ),
    reprompt: narrativeSpeechService.buildReprompt(
      generated.choices,
      generated.reprompt,
    ),
    shouldEndSession: false,
  };
}

async function processTurn(gameState, userInput) {
  const turnStart = Date.now();
  const safetyStart = Date.now();
  // 1. Analizar la entrada del usuario para detectar posibles riesgos de seguridad.
  const safetyResult = await safetyService.analyze({
    userInput,
    narrativeState: gameState.narrativeState,
    currentChoices: gameState.currentChoices,
  });
  const safetyAnalysisMs = Date.now() - safetyStart;

  console.log("SAFETY RESULT:", {
    state: safetyResult.state,
    riskTarget: safetyResult.riskTarget,
  });

  if (safetyResult.state === "UNCERTAIN") {
    logTurnLatency({
      turn: gameState.turn,
      safetyAnalysisMs,
      indicatorAnalysisMs: null,
      narrativeGenerationMs: null,
      totalMs: Date.now() - turnStart,
    });
    return safetyFlowService.handleUncertain(gameState);
  }

  if (safetyResult.state === "SAFETY_TRIGGERED") {
    logTurnLatency({
      turn: gameState.turn,
      safetyAnalysisMs,
      indicatorAnalysisMs: null,
      narrativeGenerationMs: null,
      totalMs: Date.now() - turnStart,
    });
    return safetyFlowService.handleSafetyTriggered(
      gameState,
      safetyResult.riskTarget,
    );
  }

  // El turno normal se construye sobre una copia. Si cualquier llamada al LLM
  // falla, el estado guardado en la sesión no queda parcialmente actualizado.
  const nextGameState = cloneGameState(gameState);

  nextGameState.safetyState = {
    state: "NORMAL",
    phase: null,
    awaitingImmediateSafetyAnswer: false,
  };

  // 2. Analizar la entrada del usuario para actualizar los indicadores.
  const indicatorStart = Date.now();
  const indicatorAnalysis = await indicatorAnalysisService.analyze({
    userInput,
    narrativeState: nextGameState.narrativeState,
    currentChoices: nextGameState.currentChoices,
  });
  const indicatorAnalysisMs = Date.now() - indicatorStart;

  console.log(
    "INDICATOR ANALYSIS:",
    JSON.stringify(indicatorAnalysis, null, 2),
  );

  // 3. Actualizar los indicadores en el estado del juego.
  indicatorService.applyEvidence(nextGameState.indicators, indicatorAnalysis);

  console.log(
    "UPDATED INDICATORS:",
    JSON.stringify(nextGameState.indicators, null, 2),
  );

  const focus = focusService.selectFocus(
    nextGameState.indicators,
    nextGameState.lastFocus,
  );

  console.log("SELECTED FOCUS:", focus);

  // 4. Generar la siguiente escena narrativa basada en la entrada del usuario y el estado actualizado del juego.
  console.log("PROCESS TURN:", {
    turn: nextGameState.turn,
  });

  const narrativeStart = Date.now();
  let generated;

  try {
    generated = await narrativeService.generateNextScene(
      nextGameState,
      userInput,
      focus,
      { deadlineAt: turnStart + RESPONSE_DEADLINE_MS },
    );
  } catch (error) {
    if (!llmErrorService.isLlmError(error)) {
      throw error;
    }

    const narrativeGenerationMs = Date.now() - narrativeStart;

    console.error("NARRATIVE FALLBACK USED:", {
      phase: "turn",
      turn: gameState.turn,
      code: error.code,
    });

    logTurnLatency({
      turn: gameState.turn,
      safetyAnalysisMs,
      indicatorAnalysisMs,
      narrativeGenerationMs,
      totalMs: Date.now() - turnStart,
    });

    return buildTurnRecovery(gameState);
  }
  const narrativeGenerationMs = Date.now() - narrativeStart;

  focusService.registerFocusSelection(nextGameState.indicators, focus);
  nextGameState.lastFocus = focus;

  applyNarrativeStateUpdate(nextGameState, generated.narrativeStateUpdate);

  nextGameState.currentChoices = generated.choices;

  nextGameState.turn += 1;

  logTurnLatency({
    turn: nextGameState.turn,
    safetyAnalysisMs,
    indicatorAnalysisMs,
    narrativeGenerationMs,
    totalMs: Date.now() - turnStart,
  });

  console.log(
    "TURN COMPLETED:",
    JSON.stringify(
      {
        focus,
        gameState: nextGameState,
      },
      null,
      2,
    ),
  );

  return {
    gameState: nextGameState,
    response: narrativeSpeechService.buildResponse(
      generated.narrative,
      generated.choices,
    ),
    reprompt: narrativeSpeechService.buildReprompt(
      generated.choices,
      generated.reprompt,
    ),
    shouldEndSession: false,
  };
}

function cloneGameState(gameState) {
  return JSON.parse(JSON.stringify(gameState));
}

function logTurnLatency(metrics) {
  console.log("TURN LATENCY:", {
    ...metrics,
    exceedsEightSeconds: metrics.totalMs > 8000,
  });
}

function applyNarrativeStateUpdate(gameState, update) {
  gameState.narrativeState = {
    ...gameState.narrativeState,
    ...update,
  };
}

function buildInitialNarrativeFallback() {
  return {
    narrative:
      "Estás en una cafetería tranquila cuando una persona sentada cerca de ti deja caer varias hojas al suelo. Al recogerlas, parece algo apurada y mira hacia ti.",
    reprompt: "¿Prefieres ayudarle o continuar con lo que estabas haciendo?",
    choices: [
      {
        id: "help_person",
        text: "Ayudarle a recoger las hojas",
        synonyms: ["ayudar", "recoger las hojas"],
      },
      {
        id: "continue_activity",
        text: "Continuar con lo que estabas haciendo",
        synonyms: ["continuar", "seguir a lo mío"],
      },
    ],
    narrativeStateUpdate: {
      scene: "Una persona deja caer unas hojas en una cafetería",
      location: "cafetería",
      timeOfDay: null,
      characterEmotion: { primary: "neutral", intensity: 0 },
      characterGoal: null,
      relationships: {},
      openConflicts: ["Decidir si ayudar a recoger las hojas"],
      commitments: [],
      recentEvents: ["Una persona cercana ha dejado caer varias hojas"],
      storyProgress: "introduction",
    },
  };
}

function buildTurnRecovery(gameState) {
  const choices = gameState.currentChoices || [];

  return {
    gameState,
    response: narrativeSpeechService.buildResponse(
      "No he podido continuar la historia en este momento. Puedes volver a elegir una de las opciones anteriores.",
      choices,
    ),
    reprompt: narrativeSpeechService.buildReprompt(choices),
    shouldEndSession: false,
    recoveredFromNarrativeError: true,
  };
}

module.exports = {
  startGame,
  processTurn,
};
