const Alexa = require("ask-sdk-core");
const sessionService = require("../services/sessionService");
const choiceService = require("../services/choiceService");
const narrativeSpeechService = require("../services/narrativeSpeechService");
const aplService = require("../services/aplService");

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    if (
      Alexa.getRequestType(handlerInput.requestEnvelope) !== "IntentRequest" ||
      Alexa.getIntentName(handlerInput.requestEnvelope) !==
        "AMAZON.FallbackIntent"
    ) {
      return false;
    }

    const gameState = sessionService.getGameState(handlerInput);
    return gameState?.safetyState?.state === "NORMAL";
  },

  handle(handlerInput) {
    const gameState = sessionService.getGameState(handlerInput);
    const choices = gameState.currentChoices || [];
    const reprompt = narrativeSpeechService.buildReprompt(choices);
    const responseBuilder = handlerInput.responseBuilder;

    choiceService.addDynamicEntities(responseBuilder, choices);
    aplService.addChoicesDocument(
      handlerInput,
      responseBuilder,
      choices,
      `choices-turn-${gameState.turn}`,
    );

    console.log("CHOICE FALLBACK:", {
      turn: gameState.turn,
      choicesCount: choices.length,
    });

    return responseBuilder
      .speak(
        `No he entendido esa elección. ${reprompt} ` +
          "Puedes decir elijo seguido de una opción, o indicar su número.",
      )
      .reprompt(reprompt)
      .withShouldEndSession(false)
      .getResponse();
  },
};

module.exports = FallbackIntentHandler;
