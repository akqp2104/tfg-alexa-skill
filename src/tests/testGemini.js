process.loadEnvFile();

const narrativeService = require("../services/narrativeService");
const storySeedService = require("../services/storySeedService");
const createInitialGameState = require("../state/createInitialGameState");

async function test() {
  const gameState = createInitialGameState("manual-gemini-test");
  const storySeed = storySeedService.generateStorySeed();
  const result = await narrativeService.generateInitialScene(
    gameState,
    storySeed,
  );

  console.log("Gemini narrative test completed:", {
    hasNarrative: Boolean(result.narrative),
    choiceCount: result.choices.length,
    scene: result.narrativeStateUpdate.scene,
  });
}

test().catch((error) => {
  console.error("Gemini narrative test failed:", {
    name: error?.name || "Error",
    code: error?.code || null,
  });

  process.exitCode = 1;
});
