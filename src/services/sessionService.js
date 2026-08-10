function initializeSession(handlerInput, gameState) {
  const sessionAttributes =
    handlerInput.attributesManager.getSessionAttributes();

  sessionAttributes.gameState = gameState;

  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  return gameState;
}

function getGameState(handlerInput) {
  const sessionAttributes =
    handlerInput.attributesManager.getSessionAttributes();

  return sessionAttributes.gameState || null;
}

function saveGameState(handlerInput, gameState) {
  const sessionAttributes =
    handlerInput.attributesManager.getSessionAttributes();

  sessionAttributes.gameState = gameState;

  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

module.exports = {
  initializeSession,
  getGameState,
  saveGameState,
};
