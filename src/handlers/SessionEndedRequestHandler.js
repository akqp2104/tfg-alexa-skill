// handlers/SessionEndedRequestHandler.js

const Alexa = require("ask-sdk-core");

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },

  handle(handlerInput) {
    console.log("SESSION ENDED");

    return handlerInput.responseBuilder.getResponse();
  },
};

module.exports = SessionEndedRequestHandler;
