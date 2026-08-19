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

async function generateInitialScene(gameState, storySeed) {
  const prompt = buildInitialScenePrompt(gameState, storySeed);

  return generateNarrative(prompt);
}

async function generateNextScene(gameState, userInput) {
  const prompt = buildNextScenePrompt(gameState, userInput);

  return generateNarrative(prompt);
}

async function generateNarrative(prompt) {
  return generateWithRetry(() =>
    llmService.generate({
      prompt,
      responseJsonSchema: geminiNarrativeSchema,
      zodSchema: narrativeResponseSchema,
      semanticValidator: validateNarrativeSemantics,
      task: "narrative_generation",
    }),
  );
}

async function generateWithRetry(generationFunction) {
  try {
    return await generationFunction();
  } catch (error) {
    if (!llmErrorService.isRetryable(error)) {
      throw error;
    }

    console.warn("LLM retry:", {
      attempt: 2,
      reason: error.code || error.status,
    });

    await llmErrorService.sleep(200);

    return generationFunction();
  }
}

module.exports = {
  generateInitialScene,
  generateNextScene,
};
