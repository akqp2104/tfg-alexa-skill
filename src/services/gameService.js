const narrativeService = require("./narrativeService");
const storySeedService = require("./storySeedService");
const safetyService = require("./safetyService");
const safetyFlowService = require("./safetyFlowService");
const indicatorAnalysisService = require("./indicatorAnalysisService");
const indicatorService = require("./indicatorService");
const narrativeSpeechService = require("./narrativeSpeechService");
const focusService = require("./focusService");
const llmErrorService = require("./llmErrorService");
const narrativeSummaryService = require("./narrativeSummaryService");
const progressService = require("./progressService");
const { SUMMARY_INTERVAL } = require("../config/gameConfig");
const RESPONSE_DEADLINE_MS = 7500;
const evaluationService = require("./evaluationService");
const evaluationResponseService = require("./evaluationResponseService");
const {
  sanitizeError,
} = require("./errorSanitizationService");

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
    if (!isRecoverableLlmError(error)) {
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
  const startedAt = Date.now();
  let currentStage = "initialization";
  let workingState;

  try {
    workingState = structuredClone(gameState);

    console.log("TURN_START", {
      turn: workingState.turn,
      storyProgress: workingState.narrativeState?.storyProgress,
      currentChoicesCount: workingState.currentChoices?.length || 0,
    });

    /*
     * 1. SAFETY
     */
    currentStage = "safety";

    console.log("TURN_STAGE_START", {
      turn: workingState.turn,
      stage: "safety",
    });

    const safetyStartedAt = Date.now();

    const safetyAnalysis = await safetyService.analyze({
      userInput,
      narrativeState: workingState.narrativeState,
      currentChoices: workingState.currentChoices,
    });

    console.log("TURN_STAGE_SUCCESS", {
      turn: workingState.turn,
      stage: "safety",
      durationMs: Date.now() - safetyStartedAt,
      safetyState: safetyAnalysis.state,
    });

    if (safetyAnalysis.state !== "NORMAL") {
      console.log("TURN_SAFETY_REDIRECT", {
        turn: workingState.turn,
        safetyState: safetyAnalysis.state,
      });

      return await safetyFlowService.handleSafetyResult(
        workingState,
        safetyAnalysis,
        userInput,
      );
    }

    /*
     * 2. INDICATORS
     */
    currentStage = "indicator_analysis";

    console.log("TURN_STAGE_START", {
      turn: workingState.turn,
      stage: "indicator_analysis",
    });

    const indicatorStartedAt = Date.now();

    const indicatorAnalysis = await indicatorAnalysisService.analyze({
      userInput,
      narrativeState: workingState.narrativeState,
      currentChoices: workingState.currentChoices,
    });

    console.log("TURN_STAGE_SUCCESS", {
      turn: workingState.turn,
      stage: "indicator_analysis",
      durationMs: Date.now() - indicatorStartedAt,
      evidenceCount: indicatorAnalysis.evidence?.length || 0,
    });

    indicatorService.applyEvidence(workingState.indicators, indicatorAnalysis);

    console.log("INDICATORS_UPDATED", {
      turn: workingState.turn,
      indicators: summarizeIndicators(workingState.indicators),
    });

    /*
     * 3. PROGRESO
     */
    currentStage = "story_progress";

    const previousProgress = workingState.narrativeState.storyProgress;

    const nextProgress = progressService.updateProgress(workingState);

    workingState.narrativeState.storyProgress = nextProgress;

    const forceEnding = progressService.hasReachedHardLimit(workingState);

    if (forceEnding) {
      workingState.narrativeState.storyProgress = "resolution";
    }

    console.log("STORY_PROGRESS_UPDATED", {
      turn: workingState.turn,
      previousProgress,
      nextProgress: workingState.narrativeState.storyProgress,
    });

    /*
     * 4. FOCO
     */
    currentStage = "focus_selection";

    let focus = null;

    if (workingState.narrativeState.storyProgress !== "resolution") {
      focus = focusService.selectFocus(
        workingState.indicators,
        workingState.lastFocus,
      );

      focusService.registerFocusSelection(workingState.indicators, focus);
      workingState.lastFocus = focus;

      console.log("FOCUS_SELECTED", {
        turn: workingState.turn,
        focus,
        score: workingState.indicators[focus]?.score ?? 0,
        evidenceCount: workingState.indicators[focus]?.evidenceCount ?? 0,
      });
    } else {
      console.log("FOCUS_SKIPPED", {
        turn: workingState.turn,
        reason: "story_in_resolution",
      });
    }

    /*
     * 5. LÍMITE DE DURACIÓN
     */
    currentStage = "ending_check";

    console.log("ENDING_CHECK", {
      turn: workingState.turn,
      forceEnding,
      storyProgress: workingState.narrativeState.storyProgress,
    });

    /*
     * 6. GENERACIÓN NARRATIVA
     */
    currentStage = "narrative_generation";

    console.log("TURN_STAGE_START", {
      turn: workingState.turn,
      stage: "narrative_generation",
      focus,
      forceEnding,
    });

    const narrativeStartedAt = Date.now();

    let generated;

    try {
      generated = await narrativeService.generateNextScene(
        workingState,
        userInput,
        focus,
        {
          forceEnding,
          deadlineAt: startedAt + RESPONSE_DEADLINE_MS,
        },
      );
    } catch (error) {
      if (!isRecoverableLlmError(error)) {
        throw error;
      }

      console.error("NARRATIVE_FALLBACK_USED", {
        turn: gameState.turn,
        code: error.code,
      });

      return buildTurnRecovery(gameState);
    }

    console.log("TURN_STAGE_SUCCESS", {
      turn: workingState.turn,
      stage: "narrative_generation",
      durationMs: Date.now() - narrativeStartedAt,
      storyComplete: generated.storyComplete,
      choicesCount: generated.choices?.length || 0,
    });

    /*
     * 7. VALIDACIÓN DE FINAL
     */
    currentStage = "completion_validation";

    let storyComplete = generated.storyComplete === true;

    if (storyComplete && !progressService.canFinishStory(workingState)) {
      console.warn("STORY_COMPLETE_REJECTED", {
        turn: workingState.turn,
        storyProgress: workingState.narrativeState.storyProgress,
        reason: "finish_not_allowed_by_backend",
      });

      return buildTurnRecovery(gameState);
    }

    /*
     * 8. ACTUALIZACIÓN NARRATIVA
     */
    currentStage = "narrative_state_update";

    const authoritativeProgress = workingState.narrativeState.storyProgress;

    applyNarrativeStateUpdate(workingState, generated.narrativeStateUpdate);
    workingState.narrativeState.storyProgress = authoritativeProgress;
    workingState.narrativeState.storyComplete = storyComplete;

    workingState.turn += 1;

    console.log("NARRATIVE_STATE_UPDATED", {
      turn: workingState.turn,
      storyProgress: workingState.narrativeState.storyProgress,
      recentEventsCount: workingState.narrativeState.recentEvents?.length || 0,
      openConflictsCount:
        workingState.narrativeState.openConflicts?.length || 0,
      commitmentsCount: workingState.narrativeState.commitments?.length || 0,
    });

    /*
     * 9. FINAL
     */
    currentStage = "completion_response";

    if (storyComplete) {
      workingState.currentChoices = [];

      // Generar evaluación estructurada. No requiere llamada al LLM.
      const evaluation = evaluationService.evaluateGame(workingState);

      workingState.evaluation = evaluation;

      const evaluationResponse =
        evaluationResponseService.buildFinalResponse(evaluation);

      console.log("FINAL_EVALUATION_CREATED", {
        turn: workingState.turn,

        relevantIndicators: evaluation.relevantIndicators.map((item) => ({
          indicator: item.indicator,

          level: item.level,

          evidenceCount: item.evidenceCount,

          explorationCount: item.explorationCount,
        })),

        exploredIndicators: evaluation.exploredIndicators,

        totalIndicators: evaluation.totalIndicators,
      });

      return {
        gameState: workingState,

        response: `${generated.narrative} ${evaluationResponse}`,

        reprompt: undefined,

        shouldEndSession: true,

        gameComplete: true,

        evaluation,
      };
    }

    /*
     * 10. NUEVAS OPCIONES
     */
    currentStage = "choices_update";

    workingState.currentChoices = generated.choices;

    console.log("CHOICES_UPDATED", {
      turn: workingState.turn,
      choicesCount: workingState.currentChoices?.length || 0,
    });

    /*
     * 11. NARRATIVE SUMMARY
     */
    if (workingState.turn % SUMMARY_INTERVAL === 0) {
      currentStage = "narrative_summary";

      console.log("TURN_STAGE_START", {
        turn: workingState.turn,
        stage: "narrative_summary",
      });

      const summaryStartedAt = Date.now();

      try {
        const newSummary =
          await narrativeSummaryService.updateSummary(workingState);

        workingState.narrativeSummary = newSummary;

        workingState.narrativeState.recentEvents = (
          workingState.narrativeState.recentEvents || []
        ).slice(-2);

        console.log("TURN_STAGE_SUCCESS", {
          turn: workingState.turn,
          stage: "narrative_summary",
          durationMs: Date.now() - summaryStartedAt,
          summaryLength: newSummary?.length || 0,
        });
      } catch (error) {
        if (!isRecoverableLlmError(error)) {
          throw error;
        }

        console.error("NARRATIVE_SUMMARY_SKIPPED", {
          turn: workingState.turn,
          code: error.code,
        });
      }
    }

    /*
     * 12. TURNO COMPLETADO
     */
    currentStage = "completion";

    console.log("TURN_SUCCESS", {
      turn: workingState.turn,
      durationMs: Date.now() - startedAt,
      storyProgress: workingState.narrativeState.storyProgress,
      focus,
    });

    return {
      gameState: workingState,
      response: narrativeSpeechService.buildResponse(
        generated.narrative,
        generated.choices,
      ),
      reprompt: narrativeSpeechService.buildReprompt(
        generated.choices,
        generated.reprompt,
      ),
      shouldEndSession: false,
      gameComplete: false,
    };
  } catch (error) {
    console.error("TURN_FAILED", {
      turn: gameState.turn,
      stage: currentStage,
      durationMs: Date.now() - startedAt,
      error: sanitizeError(error),
    });

    throw error;
  }
}

function logTurnLatency(metrics) {
  console.log("TURN LATENCY:", {
    ...metrics,
    exceedsEightSeconds: metrics.totalMs > 8000,
  });
}

function summarizeIndicators(indicators = {}) {
  return Object.fromEntries(
    Object.entries(indicators).map(([name, value]) => [
      name,
      {
        score: value.score,
        evidenceCount: value.evidenceCount,
        focusCount: value.focusCount ?? value.explorationCount ?? 0,
      },
    ]),
  );
}

function isRecoverableLlmError(error) {
  return (
    llmErrorService.isLlmError(error) || llmErrorService.isRetryable(error)
  );
}

// Se mantienen los últimos 8 eventos
function applyNarrativeStateUpdate(gameState, update) {
  const previousRecentEvents = gameState.narrativeState.recentEvents || [];

  const newRecentEvents = update.recentEvents || [];

  gameState.narrativeState = {
    ...gameState.narrativeState,
    ...update,

    recentEvents: [...previousRecentEvents, ...newRecentEvents].slice(-8),
  };
}

function buildInitialNarrativeFallback() {
  return {
    narrative:
      "Estás en una cafetería tranquila cuando una persona sentada cerca de ti deja caer varias hojas al suelo. Al recogerlas, parece algo apurada y mira hacia ti.",
    reprompt: "¿Prefieres ayudarle o continuar con lo que estabas haciendo?",
    storyComplete: false,
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
