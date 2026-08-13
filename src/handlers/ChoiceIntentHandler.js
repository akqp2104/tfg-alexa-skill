const Alexa = require("ask-sdk-core");
const gameService = require("../services/gameService");
const sessionService = require("../services/sessionService");
const choiceService = require("../services/choiceService");
const progressiveResponseService = require("../services/progressiveResponseService");

const ChoiceIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "ChoiceIntent"
    );
  },

  async handle(handlerInput) {
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

    console.log("Respuesta del usuario:", userInput);

    await progressiveResponseService.sendAudio(handlerInput);

    const result = await gameService.processTurn(gameState, userInput);

    sessionService.saveGameState(handlerInput, result.gameState);

    const responseBuilder = handlerInput.responseBuilder.speak(result.response);

    if (result.shouldEndSession) {
      return responseBuilder.withShouldEndSession(true).getResponse();
    }

    // Cargar las opciones que acaba
    // de generar el siguiente turno.
    choiceService.addDynamicEntities(
      responseBuilder,
      result.gameState.currentChoices,
    );

    return responseBuilder
      .reprompt(result.reprompt || "¿Qué decides hacer?")
      .getResponse();
  },
};

module.exports = ChoiceIntentHandler;
