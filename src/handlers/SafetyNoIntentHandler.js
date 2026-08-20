const Alexa = require("ask-sdk-core");
const sessionService = require("../services/sessionService");
const safetyFlowService = require("../services/safetyFlowService");
const choiceService = require("../services/choiceService");
const aplService = require("../services/aplService");

const SafetyNoIntentHandler = {
  canHandle(handlerInput) {
    if (
      Alexa.getRequestType(handlerInput.requestEnvelope) !== "IntentRequest" ||
      Alexa.getIntentName(handlerInput.requestEnvelope) !== "AMAZON.NoIntent"
    ) {
      return false;
    }

    const gameState = sessionService.getGameState(handlerInput);

    const { state, phase } = gameState?.safetyState || {};

    return (
      (state === "UNCERTAIN" && phase === "OPEN_SAFETY_CHECK") ||
      (state === "SAFETY_TRIGGERED" && phase === "DIRECT_RISK_CHECK") ||
      (state === "SAFETY_TRIGGERED" && phase === "CHECK_IMMEDIATE_DANGER")
    );
  },

  handle(handlerInput) {
    const gameState = sessionService.getGameState(handlerInput);
    const { state, phase } = gameState.safetyState;

    let result;

    if (state === "UNCERTAIN" && phase === "OPEN_SAFETY_CHECK") {
      result = safetyFlowService.dismissUncertain(gameState);
    } else if (
      state === "SAFETY_TRIGGERED" &&
      phase === "DIRECT_RISK_CHECK"
    ) {
      result = safetyFlowService.handleDirectRiskDenied(gameState);
    } else if (
      state === "SAFETY_TRIGGERED" &&
      phase === "CHECK_IMMEDIATE_DANGER"
    ) {
      result = safetyFlowService.handleNoImmediateDanger(gameState);
    } else {
      const error = new Error("INVALID_SAFETY_FLOW_STATE");
      error.code = "INVALID_SAFETY_FLOW_STATE";
      throw error;
    }

    sessionService.saveGameState(handlerInput, result.gameState);

    const responseBuilder = handlerInput.responseBuilder.speak(result.response);

    if (result.shouldEndSession) {
      return responseBuilder.withShouldEndSession(true).getResponse();
    }

    /*
     * UNCERTAIN + NO:
     * vuelve a NORMAL, pero no procesamos
     * la expresión ambigua como evidencia.
     *
     * Simplemente volvemos a presentar
     * las opciones narrativas que ya existían.
     */
    if (result.resumeNarrative) {
      choiceService.addDynamicEntities(
        responseBuilder,
        result.gameState.currentChoices,
      );
      aplService.addChoicesDocument(
        handlerInput,
        responseBuilder,
        result.gameState.currentChoices,
        `choices-turn-${result.gameState.turn}`,
      );
    }

    return responseBuilder.reprompt(result.reprompt).getResponse();
  },
};

module.exports = SafetyNoIntentHandler;
