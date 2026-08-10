const llmService = require("./llmService");

async function generateInitialScene(gameState) {
  const prompt = buildInitialScenePrompt(gameState);

  const result = await llmService.generate(prompt);

  console.log("Generated initial scene:", JSON.stringify(result, null, 2));

  return result;
}

function buildInitialScenePrompt(gameState) {
  return `
Eres un narrador de historias interactivas.

Crea la escena inicial de una historia interactiva.

Estado inicial del juego:
${JSON.stringify(gameState, null, 2)}
  `.trim();
}

module.exports = {
  generateInitialScene,
};
