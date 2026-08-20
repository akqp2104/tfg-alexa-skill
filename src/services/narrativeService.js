const llmService = require("./llmService");
const llmErrorService = require("./llmErrorService");
const narrativeResponseSchema = require("../schemas/narrativeResponseSchema");
const geminiNarrativeSchema = require("../schemas/geminiNarrativeSchema");

const {
  validateNarrativeSemantics,
} = require("../validators/narrativeValidator");

const {
  buildInitialScenePrompt,
  buildNextScenePrompt,
} = require("../prompts/narrativePrompt");

async function generateInitialScene(gameState, storySeed, options = {}) {
  const prompt = buildInitialScenePrompt(gameState, storySeed);

  return generateNarrative(prompt, options);
}

async function generateNextScene(gameState, userInput, focus, options = {}) {
  const prompt = buildNextScenePrompt(gameState, userInput, focus);

  return generateNarrative(prompt, options);
}

async function generateNarrative(prompt, { deadlineAt = Infinity } = {}) {
  const generate = (attemptPrompt) =>
    llmService.generate({
      prompt: attemptPrompt,
      responseJsonSchema: geminiNarrativeSchema,
      zodSchema: narrativeResponseSchema,
      semanticValidator: validateNarrativeSemantics,
      normalizer: normalizeNarrativeCandidate,
      maxOutputTokens: 1200,
      task: "narrative_generation",
    });

  return generateWithRetry(generate, prompt, deadlineAt);
}

async function generateWithRetry(generationFunction, prompt, deadlineAt) {
  const attemptStart = Date.now();

  try {
    return await generationFunction(prompt);
  } catch (error) {
    if (!llmErrorService.isRetryable(error)) {
      throw error;
    }

    const firstAttemptMs = Date.now() - attemptStart;
    const retryDelayMs = 200;

    if (Date.now() + firstAttemptMs + retryDelayMs >= deadlineAt) {
      console.warn("LLM retry skipped:", {
        reason: error.code || error.status,
        remainingMs: Math.max(0, deadlineAt - Date.now()),
      });
      throw error;
    }

    console.warn("LLM retry:", {
      attempt: 2,
      reason: error.code || error.status,
    });

    await llmErrorService.sleep(retryDelayMs);

    return generationFunction(buildCorrectionPrompt(prompt, error));
  }
}

function buildCorrectionPrompt(prompt, error) {
  const details = error.validationIssues?.length
    ? JSON.stringify(error.validationIssues)
    : error.reason || error.code || "INVALID_RESPONSE";

  return `${prompt}\n\nCORRECCIÓN OBLIGATORIA DEL INTENTO ANTERIOR:\nLa respuesta anterior fue rechazada por: ${details}.\nGenera una respuesta nueva completa que corrija esos problemas y respete estrictamente el esquema.`;
}

function normalizeNarrativeCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const normalized = { ...candidate };
  normalized.narrative = limitString(candidate.narrative, 1000);
  normalized.reprompt = limitString(candidate.reprompt, 250);

  if (Array.isArray(candidate.choices)) {
    normalized.choices = candidate.choices.slice(0, 3).map((choice) => {
      if (!choice || typeof choice !== "object" || Array.isArray(choice)) {
        return choice;
      }

      return {
        ...choice,
        id: limitString(choice.id, 80),
        text: limitString(choice.text, 120),
        synonyms: Array.isArray(choice.synonyms)
          ? choice.synonyms.slice(0, 5).map((value) => limitString(value, 100))
          : choice.synonyms,
      };
    });
  }

  if (
    candidate.narrativeStateUpdate &&
    typeof candidate.narrativeStateUpdate === "object" &&
    !Array.isArray(candidate.narrativeStateUpdate)
  ) {
    const state = candidate.narrativeStateUpdate;
    normalized.narrativeStateUpdate = {
      ...state,
      scene: limitString(state.scene, 120),
      location: limitNullableString(state.location, 120),
      timeOfDay: limitNullableString(state.timeOfDay, 50),
      characterGoal: limitNullableString(state.characterGoal, 200),
      characterEmotion:
        state.characterEmotion && typeof state.characterEmotion === "object"
          ? {
              ...state.characterEmotion,
              primary: limitString(state.characterEmotion.primary, 50),
            }
          : state.characterEmotion,
      openConflicts: limitStringArray(state.openConflicts, 5, 250),
      commitments: limitStringArray(state.commitments, 5, 250),
      recentEvents: limitStringArray(state.recentEvents, 5, 250),
    };
  }

  return normalized;
}

function limitString(value, maximum) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : value;
}

function limitNullableString(value, maximum) {
  return value === null ? null : limitString(value, maximum);
}

function limitStringArray(value, maximumItems, maximumLength) {
  return Array.isArray(value)
    ? value
        .slice(0, maximumItems)
        .map((item) => limitString(item, maximumLength))
    : value;
}

module.exports = {
  generateInitialScene,
  generateNextScene,
  normalizeNarrativeCandidate,
};
