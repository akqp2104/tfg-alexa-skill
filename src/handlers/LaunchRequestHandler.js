const Alexa = require("ask-sdk-core");
const createInitialGameState = require("../state/createInitialGameState");
const sessionService = require("../services/sessionService");
const gameService = require("../services/gameService");
const choiceService = require("../services/choiceService");
const progressiveResponseService = require("../services/progressiveResponseService");

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },

  async handle(handlerInput) {
    const sessionId = handlerInput.requestEnvelope.session.sessionId;
    const gameState = createInitialGameState(sessionId);

    await progressiveResponseService.sendAudio(handlerInput);

    const result = await gameService.startGame(gameState);

    sessionService.saveGameState(handlerInput, result.gameState);

    const responseBuilder = handlerInput.responseBuilder
      .speak(result.response)
      .reprompt(result.reprompt);

    choiceService.addDynamicEntities(
      responseBuilder,
      result.gameState.currentChoices,
    );

    return responseBuilder.getResponse();
  },
};

module.exports = LaunchRequestHandler;
