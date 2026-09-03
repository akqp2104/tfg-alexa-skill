const Alexa = require("ask-sdk-core");
const sessionService = require("../services/sessionService");
const safetyFlowService = require("../services/safetyFlowService");

const SafetyYesIntentHandler = {
  canHandle(handlerInput) {
    if (
      Alexa.getRequestType(handlerInput.requestEnvelope) !== "IntentRequest" ||
      Alexa.getIntentName(handlerInput.requestEnvelope) !== "AMAZON.YesIntent"
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
      result = safetyFlowService.confirmUncertainIsReal(gameState, "UNKNOWN");
    } else if (
      state === "SAFETY_TRIGGERED" &&
      phase === "DIRECT_RISK_CHECK"
    ) {
      result = safetyFlowService.handleDirectRiskConfirmed(gameState);
    } else if (
      state === "SAFETY_TRIGGERED" &&
      phase === "CHECK_IMMEDIATE_DANGER"
    ) {
      result = safetyFlowService.handleImmediateDanger(gameState);
    } else {
      const error = new Error("INVALID_SAFETY_FLOW_STATE");
      error.code = "INVALID_SAFETY_FLOW_STATE";
      throw error;
    }

    const responseBuilder = handlerInput.responseBuilder.speak(result.response);

    if (result.shouldEndSession) {
      return responseBuilder.withShouldEndSession(true).getResponse();
    }

    sessionService.saveGameState(handlerInput, result.gameState);

    return responseBuilder.reprompt(result.reprompt).getResponse();
  },
};

module.exports = SafetyYesIntentHandler;
