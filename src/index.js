const Alexa = require("ask-sdk-core");

const LaunchRequestHandler = require("./handlers/LaunchRequestHandler");
const StartStoryIntentHandler = require("./handlers/StartStoryIntentHandler");
const ChoiceIntentHandler = require("./handlers/ChoiceIntentHandler");
const HelpIntentHandler = require("./handlers/HelptIntentHandler");
const CancelAndStopIntentHandler = require("./handlers/CancelAndStopIntentHandler");

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    StartStoryIntentHandler,
    ChoiceIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
  )
  .lambda();
