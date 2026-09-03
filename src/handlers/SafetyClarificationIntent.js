const Alexa = require("ask-sdk-core");
const sessionService = require("../services/sessionService");
const safetyService = require("../services/safetyService");
const safetyFlowService = require("../services/safetyFlowService");
const choiceService = require("../services/choiceService");
const aplService = require("../services/aplService");

const SafetyClarificationIntentHandler = {
  canHandle(handlerInput) {
    if (
      Alexa.getRequestType(handlerInput.requestEnvelope) !== "IntentRequest" ||
      Alexa.getIntentName(handlerInput.requestEnvelope) !==
        "SafetyClarificationIntent"
    ) {
      return false;
    }

    const gameState = sessionService.getGameState(handlerInput);

    return (
      gameState?.safetyState?.phase === "OPEN_SAFETY_CHECK" ||
      gameState?.safetyState?.phase === "DIRECT_RISK_CHECK" ||
      gameState?.safetyState?.phase === "CHECK_IMMEDIATE_DANGER"
    );
  },

  async handle(handlerInput) {
    const gameState = sessionService.getGameState(handlerInput);

    const clarification = Alexa.getSlotValue(
      handlerInput.requestEnvelope,
      "clarification",
    );

    const result = await safetyService.analyzeClarification({
      clarification,
      safetyState: gameState.safetyState,
    });

    let flowResult;

    const phase = gameState.safetyState.phase;

    if (phase === "OPEN_SAFETY_CHECK") {
      if (result.state === "SAFETY_TRIGGERED") {
        flowResult = safetyFlowService.confirmUncertainIsReal(
          gameState,
          result.riskTarget,
        );
      } else if (result.state === "NORMAL") {
        flowResult = safetyFlowService.dismissUncertain(gameState);
      } else {
        flowResult = safetyFlowService.handleUncertain(gameState);
      }
    } else if (phase === "DIRECT_RISK_CHECK") {
      if (result.state === "SAFETY_TRIGGERED") {
        flowResult = safetyFlowService.handleDirectRiskConfirmed(gameState);
      } else if (result.state === "NORMAL") {
        flowResult = safetyFlowService.handleDirectRiskDenied(gameState);
      } else {
        flowResult = safetyFlowService.repeatDirectRiskQuestion(gameState);
      }
    } else if (phase === "CHECK_IMMEDIATE_DANGER") {
      if (result.state === "SAFETY_TRIGGERED") {
        flowResult = safetyFlowService.handleImmediateDanger(gameState);
      } else if (result.state === "NORMAL") {
        flowResult = safetyFlowService.handleNoImmediateDanger(gameState);
      } else {
        flowResult = safetyFlowService.repeatImmediateDangerQuestion(gameState);
      }
    }

    const responseBuilder = handlerInput.responseBuilder.speak(
      flowResult.response,
    );

    if (flowResult.shouldEndSession) {
      return responseBuilder.withShouldEndSession(true).getResponse();
    }

    sessionService.saveGameState(handlerInput, flowResult.gameState);

    if (flowResult.resumeNarrative) {
      choiceService.addDynamicEntities(
        responseBuilder,
        flowResult.gameState.currentChoices,
      );
      aplService.addChoicesDocument(
        handlerInput,
        responseBuilder,
        flowResult.gameState.currentChoices,
        `choices-turn-${flowResult.gameState.turn}`,
      );
    }

    return responseBuilder.reprompt(flowResult.reprompt).getResponse();
  },
};

module.exports = SafetyClarificationIntentHandler;
