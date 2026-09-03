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
const logMetric = require("../observability/logMetric");

async function startGame(gameState) {
  const start = Date.now();
  const metrics = createTurnMetrics();
  console.log("START GAME");

  const storySeed = storySeedService.generateStorySeed();
  let generated;

  try {
    generated = await narrativeService.generateInitialScene(
      gameState,
      storySeed,
      {
        deadlineAt: start + RESPONSE_DEADLINE_MS,
        onRetry: (retry) => registerRetry(metrics, retry),
      },
    );
  } catch (error) {
    if (!isRecoverableLlmError(error)) {
      throw error;
    }

    metrics.fallbackUsed = true;
    logMetric("NARRATIVE_FALLBACK", {
      turn: 1,
      phase: "initial",
      reason: error.code,
      durationMs: Date.now() - start,
    });
    generated = buildInitialNarrativeFallback();
  }

  applyNarrativeStateUpdate(gameState, generated.narrativeStateUpdate);

  gameState.currentChoices = generated.choices;

  gameState.turn = 1;

  metrics.narrativeDurationMs = Date.now() - start;

  logMetric("GAME_START_COMPLETED", {
    turn: gameState.turn,
    totalDurationMs: Date.now() - start,
    narrativeDurationMs: metrics.narrativeDurationMs,
    retryCount: metrics.retryCount,
    retryDurationMs: metrics.retryDurationMs,
    fallbackUsed: metrics.fallbackUsed,
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
  const metrics = createTurnMetrics();
  let currentStage = "initialization";
  let workingState;

  try {
    workingState = structuredClone(gameState);

    console.log("TURN_START", {
      turn: workingState.turn,
      storyProgress: workingState.narrativeState?.storyProgress,
      currentChoicesCount: workingState.currentChoices?.length || 0,
    });

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

    metrics.safetyDurationMs = Date.now() - safetyStartedAt;

    console.log("TURN_STAGE_SUCCESS", {
      turn: workingState.turn,
      stage: "safety",
      durationMs: metrics.safetyDurationMs,
      safetyState: safetyAnalysis.state,
    });

    if (safetyAnalysis.state !== "NORMAL") {
      console.log("TURN_SAFETY_REDIRECT", {
        turn: workingState.turn,
        safetyState: safetyAnalysis.state,
      });

      const result = await safetyFlowService.handleSafetyResult(
        workingState,
        safetyAnalysis,
        userInput,
      );

      logCompletedTurn({
        turn: workingState.turn,
        startedAt,
        outcome: "safety_redirect",
        metrics,
      });

      return result;
    }

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

    metrics.indicatorDurationMs = Date.now() - indicatorStartedAt;

    console.log("TURN_STAGE_SUCCESS", {
      turn: workingState.turn,
      stage: "indicator_analysis",
      durationMs: metrics.indicatorDurationMs,
      evidenceCount: indicatorAnalysis.evidence?.length || 0,
    });

    indicatorService.applyEvidence(workingState.indicators, indicatorAnalysis);

    console.log("INDICATORS_UPDATED", {
      turn: workingState.turn,
      indicators: summarizeIndicators(workingState.indicators),
    });

    currentStage = "story_progress";

    const previousProgress = workingState.narrativeState.storyProgress;

    const nextProgress = progressService.updateProgress(workingState);

    workingState.narrativeState.storyProgress = nextProgress;

    const forceEnding = progressService.nextSceneReachesHardLimit(workingState);

    if (forceEnding) {
      workingState.narrativeState.storyProgress = "resolution";
    }

    console.log("STORY_PROGRESS_UPDATED", {
      turn: workingState.turn,
      previousProgress,
      nextProgress: workingState.narrativeState.storyProgress,
    });

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

    currentStage = "ending_check";

    console.log("ENDING_CHECK", {
      turn: workingState.turn,
      forceEnding,
      storyProgress: workingState.narrativeState.storyProgress,
    });

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
          onRetry: (retry) => registerRetry(metrics, retry),
        },
      );
    } catch (error) {
      metrics.narrativeDurationMs = Date.now() - narrativeStartedAt;

      if (!isRecoverableLlmError(error)) {
        throw error;
      }

      metrics.fallbackUsed = true;

      logMetric("NARRATIVE_FALLBACK", {
        turn: gameState.turn,
        phase: "turn",
        reason: error.code,
        durationMs: metrics.narrativeDurationMs,
      });

      logCompletedTurn({
        turn: gameState.turn,
        startedAt,
        outcome: "fallback",
        metrics,
      });

      return buildTurnRecovery(gameState);
    }

    metrics.narrativeDurationMs = Date.now() - narrativeStartedAt;

    console.log("TURN_STAGE_SUCCESS", {
      turn: workingState.turn,
      stage: "narrative_generation",
      durationMs: metrics.narrativeDurationMs,
      storyComplete: generated.storyComplete,
      choicesCount: generated.choices?.length || 0,
    });

    currentStage = "completion_validation";

    let storyComplete = generated.storyComplete === true;

    if (storyComplete && !progressService.canFinishStory(workingState)) {
      console.warn("STORY_COMPLETE_REJECTED", {
        turn: workingState.turn,
        storyProgress: workingState.narrativeState.storyProgress,
        reason: "finish_not_allowed_by_backend",
      });

      metrics.fallbackUsed = true;
      logMetric("NARRATIVE_FALLBACK", {
        turn: gameState.turn,
        phase: "turn",
        reason: "STORY_COMPLETE_REJECTED",
        durationMs: metrics.narrativeDurationMs,
      });
      logCompletedTurn({
        turn: gameState.turn,
        startedAt,
        outcome: "fallback",
        metrics,
      });

      return buildTurnRecovery(gameState);
    }

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

    currentStage = "completion_response";

    if (storyComplete) {
      workingState.currentChoices = [];

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

      logCompletedTurn({
        turn: workingState.turn,
        startedAt,
        outcome: "game_completed",
        metrics,
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

    currentStage = "choices_update";

    workingState.currentChoices = generated.choices;

    console.log("CHOICES_UPDATED", {
      turn: workingState.turn,
      choicesCount: workingState.currentChoices?.length || 0,
    });

    if (workingState.turn % SUMMARY_INTERVAL === 0) {
      currentStage = "narrative_summary";
      metrics.summaryAttempted = true;

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

        metrics.summaryDurationMs = Date.now() - summaryStartedAt;

        console.log("TURN_STAGE_SUCCESS", {
          turn: workingState.turn,
          stage: "narrative_summary",
          durationMs: metrics.summaryDurationMs,
          summaryLength: newSummary?.length || 0,
        });

        logMetric("NARRATIVE_SUMMARY", {
          turn: workingState.turn,
          outcome: "success",
          durationMs: metrics.summaryDurationMs,
          summaryLength: newSummary?.length || 0,
        });
      } catch (error) {
        metrics.summaryDurationMs = Date.now() - summaryStartedAt;

        if (!isRecoverableLlmError(error)) {
          throw error;
        }

        logMetric("NARRATIVE_SUMMARY", {
          turn: workingState.turn,
          outcome: "skipped",
          reason: error.code,
          durationMs: metrics.summaryDurationMs,
        });
      }
    }

    currentStage = "completion";

    logCompletedTurn({
      turn: workingState.turn,
      startedAt,
      outcome: "continued",
      metrics,
      storyProgress: workingState.narrativeState.storyProgress,
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

function createTurnMetrics() {
  return {
    safetyDurationMs: null,
    indicatorDurationMs: null,
    narrativeDurationMs: null,
    summaryAttempted: false,
    summaryDurationMs: 0,
    retryCount: 0,
    retryDurationMs: 0,
    fallbackUsed: false,
  };
}

function registerRetry(metrics, retry) {
  metrics.retryCount += 1;
  metrics.retryDurationMs += retry.retryDurationMs;
}

function logCompletedTurn({
  turn,
  startedAt,
  outcome,
  metrics,
  storyProgress = null,
}) {
  const totalDurationMs = Date.now() - startedAt;

  logMetric("TURN_COMPLETED", {
    turn,
    outcome,
    totalDurationMs,
    safetyDurationMs: metrics.safetyDurationMs,
    indicatorDurationMs: metrics.indicatorDurationMs,
    narrativeDurationMs: metrics.narrativeDurationMs,
    summaryAttempted: metrics.summaryAttempted,
    summaryDurationMs: metrics.summaryDurationMs,
    retryCount: metrics.retryCount,
    retryDurationMs: metrics.retryDurationMs,
    fallbackUsed: metrics.fallbackUsed,
    storyProgress,
    exceedsEightSeconds: totalDurationMs > 8000,
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

function applyNarrativeStateUpdate(gameState, update) {
  const previousRecentEvents = gameState.narrativeState.recentEvents || [];

  const newRecentEvents = update.recentEvents || [];

  gameState.narrativeState = {
    ...gameState.narrativeState,
    ...update,

    // Acotar la memoria narrativa limita el tamaño de los prompts posteriores.
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
