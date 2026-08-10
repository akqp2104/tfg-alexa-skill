const Alexa = require("ask-sdk-core");
const createInitialGameState = require("../state/createInitialGameState");
const sessionService = require("../services/sessionService");
const gameService = require("../services/gameService");
const choiceService = require("../services/choiceService");

const StartStoryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "StartStoryIntent"
    );
  },

  async handle(handlerInput) {
    const sessionId = handlerInput.requestEnvelope.session.sessionId;

    const gameState = createInitialGameState(sessionId);

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

module.exports = StartStoryIntentHandler;
