const Alexa = require("ask-sdk-core");
const gameService = require("../services/gameService");
const sessionService = require("../services/sessionService");
const choiceService = require("../services/choiceService");
const aplService = require("../services/aplService");

const ChoiceIntentHandler = {
  canHandle(handlerInput) {
    const isChoiceIntent =
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "ChoiceIntent";

    if (!isChoiceIntent) {
      return false;
    }

    const gameState = sessionService.getGameState(handlerInput);

    return !gameState || gameState.safetyState?.state === "NORMAL";
  },

  async handle(handlerInput) {
    const requestStart = Date.now();
    const gameState = sessionService.getGameState(handlerInput);

    if (!gameState) {
      return handlerInput.responseBuilder
        .speak(
          "No hay ninguna partida activa. " +
            "Puedes comenzar una nueva historia.",
        )
        .withShouldEndSession(true)
        .getResponse();
    }

    const userInput = choiceService.getUserInput(handlerInput);

    if (!userInput?.rawText) {
      return handlerInput.responseBuilder
        .speak("No he entendido tu respuesta. " + "¿Puedes repetirla?")
        .reprompt("¿Qué decides hacer?")
        .getResponse();
    }

    console.log("USER INPUT RECEIVED:", {
      hasText: Boolean(userInput.rawText),
      hasResolvedChoice: Boolean(userInput.resolvedChoice),
    });

    const result = await gameService.processTurn(gameState, userInput);

    const responseBuilder = handlerInput.responseBuilder;

    if (result.shouldEndSession) {
      logRequestLatency("ChoiceIntent", requestStart);
      return responseBuilder
        .speak(result.response)
        .withShouldEndSession(true)
        .getResponse();
    }

    sessionService.saveGameState(handlerInput, result.gameState);

    let usesAplSpeech = false;

    if (result.gameState.safetyState?.state === "NORMAL") {
      // Cargar las opciones que acaba de generar el siguiente turno.
      choiceService.addDynamicEntities(
        responseBuilder,
        result.gameState.currentChoices,
      );
      usesAplSpeech = aplService.addSpokenChoicesDocument(
        handlerInput,
        responseBuilder,
        result.gameState.currentChoices,
        `choices-turn-${result.gameState.turn}`,
        result.response,
      );
    }

    if (!usesAplSpeech) {
      responseBuilder.speak(result.response);
    }

    if (!usesAplSpeech) {
      responseBuilder
        .reprompt(result.reprompt || "¿Qué decides hacer?")
        .withShouldEndSession(false);
    }

    const response = responseBuilder.getResponse();

    logRequestLatency("ChoiceIntent", requestStart);

    return response;
  },
};

function logRequestLatency(requestType, start) {
  const totalMs = Date.now() - start;

  console.log("ALEXA REQUEST LATENCY:", {
    requestType,
    totalMs,
    exceedsEightSeconds: totalMs > 8000,
  });
}

module.exports = ChoiceIntentHandler;
