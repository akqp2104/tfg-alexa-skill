function initializeSession(handlerInput, initialSceneId) {
  const sessionAttributes =
    handlerInput.attributesManager.getSessionAttributes();

  sessionAttributes.currentScene = initialSceneId;
  sessionAttributes.history = [];
  sessionAttributes.indicators = {};

  saveSession(handlerInput, sessionAttributes);

  return sessionAttributes;
}

function getSession(handlerInput) {
  return handlerInput.attributesManager.getSessionAttributes();
}

function saveSession(handlerInput, sessionAttributes) {
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

function registerChoice(sessionAttributes, sceneId, choice) {
  if (!sessionAttributes.history) {
    sessionAttributes.history = [];
  }

  sessionAttributes.history.push({
    scene: sceneId,
    choice: choice,
  });
}

function accumulateIndicators(sessionAttributes, indicators = {}) {
  if (!sessionAttributes.indicators) {
    sessionAttributes.indicators = {};
  }

  for (const [indicator, value] of Object.entries(indicators)) {
    sessionAttributes.indicators[indicator] =
      (sessionAttributes.indicators[indicator] || 0) + value;
  }
}

function updateCurrentScene(sessionAttributes, sceneId) {
  sessionAttributes.currentScene = sceneId;
}

function applyChoiceResult(handlerInput, currentSceneId, choice, result) {
  const sessionAttributes = getSession(handlerInput);

  registerChoice(sessionAttributes, currentSceneId, choice);

  accumulateIndicators(sessionAttributes, result.indicators);

  updateCurrentScene(sessionAttributes, result.sceneId);

  saveSession(handlerInput, sessionAttributes);

  return sessionAttributes;
}

module.exports = {
  initializeSession,
  getSession,
  saveSession,
  registerChoice,
  accumulateIndicators,
  updateCurrentScene,
  applyChoiceResult,
};
