const Alexa = require("ask-sdk-core");
const createInitialGameState = require("../state/createInitialGameState");
const sessionService = require("../services/sessionService");
const gameService = require("../services/gameService");
const choiceService = require("../services/choiceService");
const aplService = require("../services/aplService");

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },

  async handle(handlerInput) {
    const requestStart = Date.now();
    const sessionId = handlerInput.requestEnvelope.session.sessionId;
    const gameState = createInitialGameState(sessionId);

    const result = await gameService.startGame(gameState);

    sessionService.saveGameState(handlerInput, result.gameState);

    const responseBuilder = handlerInput.responseBuilder;

    choiceService.addDynamicEntities(
      responseBuilder,
      result.gameState.currentChoices,
    );
    const usesAplSpeech = aplService.addSpokenChoicesDocument(
      handlerInput,
      responseBuilder,
      result.gameState.currentChoices,
      `choices-turn-${result.gameState.turn}`,
      result.response,
    );

    if (!usesAplSpeech) {
      responseBuilder.speak(result.response);
    }

    if (!usesAplSpeech) {
      responseBuilder.reprompt(result.reprompt).withShouldEndSession(false);
    }

    const response = responseBuilder.getResponse();
    const totalMs = Date.now() - requestStart;

    console.log("ALEXA REQUEST LATENCY:", {
      requestType: "LaunchRequest",
      totalMs,
      exceedsEightSeconds: totalMs > 8000,
    });

    return response;
  },
};

module.exports = LaunchRequestHandler;
