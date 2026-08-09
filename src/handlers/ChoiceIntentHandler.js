const Alexa = require("ask-sdk-core");

const storyService = require("../services/storyService");

const sessionService = require("../services/sessionService");

const evaluationService = require("../services/evaluationService");

const choiceService = require("../services/choiceService");

const ChoiceIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "ChoiceIntent"
    );
  },

  handle(handlerInput) {
    const sessionAttributes = sessionService.getSession(handlerInput);

    const currentSceneId = sessionAttributes.currentScene;

    const choice = choiceService.getResolvedChoice(handlerInput, "choice");

    console.log("Choice normalizada:", choice);

    const result = storyService.getNextScene(currentSceneId, choice);

    if (!result.success) {
      return handleStoryError(handlerInput, result.error);
    }

    const updatedSession = sessionService.applyChoiceResult(
      handlerInput,
      currentSceneId,
      choice,
      result,
    );

    if (result.scene.isFinal) {
      return handleFinalScene(handlerInput, result.scene, updatedSession);
    }

    return handlerInput.responseBuilder
      .speak(result.scene.text)
      .reprompt(result.scene.reprompt)
      .getResponse();
  },
};

function handleStoryError(handlerInput, error) {
  if (error === "INVALID_CHOICE") {
    return handlerInput.responseBuilder
      .speak("No he entendido tu elección.")
      .reprompt("Intenta elegir una de las opciones disponibles.")
      .getResponse();
  }

  return handlerInput.responseBuilder
    .speak("Ha ocurrido un problema al continuar la historia.")
    .getResponse();
}

function handleFinalScene(handlerInput, scene, sessionAttributes) {
  const evaluation = evaluationService.evaluate(sessionAttributes.indicators);

  const evaluationSummary = evaluationService.buildSummary(evaluation);

  const speakOutput =
    `${scene.text} ` +
    `${evaluationSummary} ` +
    "Este resultado es únicamente orientativo y no constituye un diagnóstico médico.";

  return handlerInput.responseBuilder
    .speak(speakOutput)
    .withShouldEndSession(true)
    .getResponse();
}

module.exports = ChoiceIntentHandler;
