const Alexa = require("ask-sdk-core");

const LaunchRequestHandler = require("./handlers/LaunchRequestHandler");
const ChoiceIntentHandler = require("./handlers/ChoiceIntentHandler");
const HelpIntentHandler = require("./handlers/HelptIntentHandler");
const CancelAndStopIntentHandler = require("./handlers/CancelAndStopIntentHandler");
const SessionEndedRequestHandler = require("./handlers/SessionEndedRequestHandler");
const ErrorHandler = require("./handlers/ErrorHandler");
const SafetyYesIntentHandler = require("./handlers/SafetyYesIntentHandler");
const SafetyNoIntentHandler = require("./handlers/SafetyNoIntentHandler");
const SafetyClarificationIntentHandler = require("./handlers/SafetyClarificationIntent");

const RequestLoggingInterceptor = {
  process(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    console.log("REQUEST METADATA:", {
      type: request.type,
      intentName: request.intent?.name || null,
    });
  },
};

const ResponseLoggingInterceptor = {
  process(handlerInput, response) {
    console.log("RESPONSE METADATA:", {
      shouldEndSession: response?.shouldEndSession === true,
      hasDirectives: Boolean(response?.directives?.length),
    });
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    SafetyYesIntentHandler,
    SafetyNoIntentHandler,
    SafetyClarificationIntentHandler,
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
