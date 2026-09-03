const Alexa = require("ask-sdk-core");

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },

  handle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    console.log("SESSION ENDED:", {
      reason: request.reason || null,
      errorType: request.error?.type || null,
    });

    return handlerInput.responseBuilder.getResponse();
  },
};

module.exports = SessionEndedRequestHandler;
