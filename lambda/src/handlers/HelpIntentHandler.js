const Alexa = require("ask-sdk-core");

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },

  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        "Puedes responder a las opciones que te voy proponiendo durante la historia.",
      )
      .reprompt("¿Quieres continuar?")
      .getResponse();
  },
};

module.exports = HelpIntentHandler;
