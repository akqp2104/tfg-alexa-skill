const narrativeService = require("./narrativeService");
const storySeedService = require("./storySeedService");
const choiceService = require("./choiceService");

async function startGame(gameState) {
  console.log("START GAME:", {
    sessionId: gameState.sessionId,
  });

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
    narrativeState: gameState.narrativeState,
    currentChoices: gameState.currentChoices,
  });

  return {
    gameState,
    response: generated.narrative,
    reprompt: generated.reprompt,
    shouldEndSession: false,
  };
}

async function processTurn(gameState, userInput) {
  console.log("PROCESS TURN:", {
    turn: gameState.turn,
    userInput,
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
    narrativeState: gameState.narrativeState,
    currentChoices: gameState.currentChoices,
  });

  return {
    gameState,
    response: generated.narrative,
    reprompt: choiceService.buildChoicesSpeech(generated.choices),
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
