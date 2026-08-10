const narrativeService = require("./narrativeService");

async function startGame(gameState) {
  const generated = await narrativeService.generateInitialScene(gameState);

  applyNarrativeStateUpdate(gameState, generated.narrativeStateUpdate);

  gameState.currentChoices = generated.choices;

  gameState.turn = 1;

  return {
    gameState,
    response: generated.narrative,
    reprompt: generated.reprompt,
    shouldEndSession: false,
  };
}

// Por ahora, la función processTurn simplemente incrementa el turno y devuelve un mensaje de confirmación. En el futuro, se implementará la lógica para procesar la elección del usuario y actualizar el estado del juego en consecuencia.
async function processTurn(gameState, userInput) {
  console.log("User input:", userInput);

  gameState.turn += 1;

  return {
    gameState,
    response:
      "He recibido tu decisión correctamente. La historia continuará desde aquí.",
    reprompt: "¿Qué quieres hacer ahora?",
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
