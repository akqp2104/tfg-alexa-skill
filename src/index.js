const Alexa = require("ask-sdk-core");

const LaunchRequestHandler = require("./handlers/LaunchRequestHandler");
const ChoiceIntentHandler = require("./handlers/ChoiceIntentHandler");
const HelpIntentHandler = require("./handlers/HelptIntentHandler");
const CancelAndStopIntentHandler = require("./handlers/CancelAndStopIntentHandler");
const SessionEndedRequestHandler = require("./handlers/SessionEndedRequestHandler");
const ErrorHandler = require("./handlers/ErrorHandler");

const RequestLoggingInterceptor = {
  process(handlerInput) {
    console.log(
      "REQUEST:",
      JSON.stringify(handlerInput.requestEnvelope.request, null, 2),
    );
  },
};

const ResponseLoggingInterceptor = {
  process(handlerInput, response) {
    console.log("RESPONSE:", JSON.stringify(response, null, 2));
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChoiceIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
  )
  .addRequestInterceptors(RequestLoggingInterceptor)
  .addResponseInterceptors(ResponseLoggingInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
