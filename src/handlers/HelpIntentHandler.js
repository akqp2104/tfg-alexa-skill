const Alexa = require("ask-sdk-core");

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },

  handle(handlerInput) {
    const speakOutput =
      "Durante la historia te propondré diferentes opciones. " +
      "Puedes responder diciendo la opción que prefieras. " +
      "Si Alexa deja de escuchar mientras estás pensando, " +
      "di Alexa seguido de tu elección para continuar.";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt("¿Qué decides hacer?")
      .withShouldEndSession(false)
      .getResponse();
  },
};

module.exports = HelpIntentHandler;
