const Alexa = require("ask-sdk-core");
const sessionService = require("../services/sessionService");
const narrativeSpeechService = require("../services/narrativeSpeechService");

const EVENT_NAME = "narration-complete";

const AplNarrationCompleteHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
        "Alexa.Presentation.APL.UserEvent" &&
      request.arguments?.[0] === EVENT_NAME
    );
  },

  handle(handlerInput) {
    const gameState = sessionService.getGameState(handlerInput);
    const reprompt = narrativeSpeechService.buildReprompt(
      gameState?.currentChoices,
      "¿Qué decides hacer?",
    );

    console.log("APL NARRATION COMPLETED:", {
      turn: gameState?.turn ?? null,
      choicesCount: gameState?.currentChoices?.length ?? 0,
    });

    return handlerInput.responseBuilder
      .reprompt(reprompt)
      .withShouldEndSession(false)
      .getResponse();
  },
};

module.exports = AplNarrationCompleteHandler;
