const llmService = require("./llmService");

const {
  buildInitialScenePrompt,
  buildNextScenePrompt,
} = require("../prompts/narrativePrompt");

async function generateInitialScene(gameState) {
  const prompt = buildInitialScenePrompt(gameState);

  return await llmService.generate(prompt);
}

async function generateNextScene(gameState, userInput) {
  const prompt = buildNextScenePrompt(gameState, userInput);

  return await llmService.generate(prompt);
}

module.exports = {
  generateInitialScene,
  generateNextScene,
};
