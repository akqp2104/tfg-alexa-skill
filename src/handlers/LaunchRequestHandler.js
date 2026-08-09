const Alexa = require("ask-sdk-core");

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },

  handle(handlerInput) {
    const speakOutput =
      "Bienvenida a Mi Aventura. ¿Quieres comenzar la historia?";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt("¿Quieres comenzar?")
      .getResponse();
  },
};

module.exports = LaunchRequestHandler;