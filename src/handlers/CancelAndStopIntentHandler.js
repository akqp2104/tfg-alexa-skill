const Alexa = require("ask-sdk-core");

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      ["AMAZON.CancelIntent", "AMAZON.StopIntent"].includes(
        Alexa.getIntentName(handlerInput.requestEnvelope),
      )
    );
  },

  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("De acuerdo. Hasta la próxima.")
      .withShouldEndSession(true)
      .getResponse();
  },
};

module.exports = CancelAndStopIntentHandler;
