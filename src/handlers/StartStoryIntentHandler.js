const Alexa = require("ask-sdk-core");

const storyService = require("../services/storyService");
const sessionService = require("../services/sessionService");

const StartStoryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "StartStoryIntent"
    );
  },

  handle(handlerInput) {
    const initialSceneId = storyService.getInitialSceneId();

    const initialScene = storyService.getInitialScene();

    if (!initialScene) {
      return handlerInput.responseBuilder
        .speak("No he podido iniciar la historia.")
        .getResponse();
    }

    sessionService.initializeSession(handlerInput, initialSceneId);

    return handlerInput.responseBuilder
      .speak(initialScene.text)
      .reprompt(initialScene.reprompt)
      .getResponse();
  },
};

module.exports = StartStoryIntentHandler;
