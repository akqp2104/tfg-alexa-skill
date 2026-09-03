const test = require("node:test");
const assert = require("node:assert/strict");

const safetyFlowService = require("../services/safetyFlowService");
const SafetyYesIntentHandler = require("../handlers/SafetyYesIntentHandler");
const SafetyNoIntentHandler = require("../handlers/SafetyNoIntentHandler");
const ChoiceIntentHandler = require("../handlers/ChoiceIntentHandler");
const {
  buildSafetyPrompt,
  buildSafetyClarificationPrompt,
} = require("../prompts/safetyPrompt");

function createGameState() {
  return {
    currentChoices: [{ id: "continue", text: "Continuar" }],
    safetyState: { state: "NORMAL", phase: null },
  };
}

function createHandlerInput(intentName, gameState) {
  const sessionAttributes = { gameState };
  const response = {};
  const responseBuilder = {
    speak(text) {
      response.outputSpeech = text;
      return this;
    },
    reprompt(text) {
      response.reprompt = text;
      return this;
    },
    withShouldEndSession(value) {
      response.shouldEndSession = value;
      return this;
    },
    addDirective(directive) {
      response.directive = directive;
      return this;
    },
    getResponse() {
      return response;
    },
  };

  return {
    requestEnvelope: {
      request: {
        type: "IntentRequest",
        intent: { name: intentName },
      },
    },
    attributesManager: {
      getSessionAttributes: () => sessionAttributes,
      setSessionAttributes: (attributes) => {
        Object.assign(sessionAttributes, attributes);
      },
    },
    responseBuilder,
  };
}

test("an uncertain message pauses the narrative to clarify the real world", () => {
  const result = safetyFlowService.handleUncertain(createGameState());

  assert.deepEqual(result.gameState.safetyState, {
    state: "UNCERTAIN",
    phase: "OPEN_SAFETY_CHECK",
  });
  assert.match(result.response, /no soy una profesional sanitaria/);
  assert.equal(result.shouldEndSession, false);
});

test("the generic safety router handles uncertain and triggered results", () => {
  const uncertainState = createGameState();
  const uncertain = safetyFlowService.handleSafetyResult(uncertainState, {
    state: "UNCERTAIN",
    riskTarget: "UNKNOWN",
  });
  assert.equal(uncertain.gameState.safetyState.phase, "OPEN_SAFETY_CHECK");

  const triggeredState = createGameState();
  const triggered = safetyFlowService.handleSafetyResult(triggeredState, {
    state: "SAFETY_TRIGGERED",
    riskTarget: "OTHERS",
  });
  assert.equal(triggered.gameState.safetyState.phase, "DIRECT_RISK_CHECK");
  assert.equal(triggered.gameState.safetyState.questionTarget, "OTHERS");
});

test("a fictional clarification resumes the existing adventure", () => {
  const state = createGameState();
  const result = safetyFlowService.dismissUncertain(state);

  assert.deepEqual(result.gameState.safetyState, {
    state: "NORMAL",
    phase: null,
  });
  assert.equal(result.resumeNarrative, true);
  assert.equal(result.shouldEndSession, false);
  assert.equal(result.gameState.currentChoices[0].id, "continue");
});

test("confirmed real-world risk asks directly about current thoughts", () => {
  const result = safetyFlowService.confirmUncertainIsReal(
    createGameState(),
    "SELF",
  );

  assert.equal(result.gameState.safetyState.state, "SAFETY_TRIGGERED");
  assert.equal(result.gameState.safetyState.phase, "DIRECT_RISK_CHECK");
  assert.equal(result.gameState.safetyState.questionTarget, "SELF");
  assert.match(result.response, /hacerte daño o en suicidarte/);
  assert.equal(result.shouldEndSession, false);
});

test("immediate danger provides resources and ends the game", () => {
  const result = safetyFlowService.handleImmediateDanger(createGameState());

  assert.equal(result.shouldEndSession, true);
  assert.equal(result.reprompt, null);
  assert.match(result.response, /no quedarte a solas/);
  assert.match(result.response, /112/);
  assert.match(result.response, /024/);
  assert.equal(result.gameState.safetyState.state, "SAFETY_TRIGGERED");
  assert.equal(result.gameState.safetyState.phase, "FINALIZED");
});

test("non-immediate real-world risk still provides help and ends the game", () => {
  const result = safetyFlowService.handleNoImmediateDanger(createGameState());

  assert.equal(result.shouldEndSession, true);
  assert.match(result.response, /no quedarte a solas/);
  assert.match(result.response, /112/);
  assert.match(result.response, /024/);
});

test("the safety prompt contains the actual input and narrative context", () => {
  const prompt = buildSafetyPrompt(
    { rawText: "Esto me está pasando de verdad", resolvedChoice: null },
    { scene: "bosque" },
    [{ id: "run", text: "Huir" }],
  );

  assert.match(prompt, /Esto me está pasando de verdad/);
  assert.match(prompt, /bosque/);
  assert.match(prompt, /Huir/);
});

test("clarification prompts distinguish fiction and immediate danger", () => {
  const fictionPrompt = buildSafetyClarificationPrompt("solo el personaje", {
    phase: "CLARIFY_REAL_WORLD",
  });
  const dangerPrompt = buildSafetyClarificationPrompt("sí, ahora", {
    phase: "CHECK_IMMEDIATE_DANGER",
  });

  assert.match(fictionPrompt, /personaje ficticio/);
  assert.match(dangerPrompt, /plan próximo|acceso inmediato/);
});

test("YES confirms real-world meaning and then confirms immediate danger", () => {
  const state = createGameState();
  state.safetyState = {
    state: "UNCERTAIN",
    phase: "OPEN_SAFETY_CHECK",
  };
  let handlerInput = createHandlerInput("AMAZON.YesIntent", state);

  assert.equal(SafetyYesIntentHandler.canHandle(handlerInput), true);
  let response = SafetyYesIntentHandler.handle(handlerInput);
  assert.equal(response.shouldEndSession, undefined);
  assert.equal(state.safetyState.phase, "DIRECT_RISK_CHECK");

  handlerInput = createHandlerInput("AMAZON.YesIntent", state);
  response = SafetyYesIntentHandler.handle(handlerInput);
  assert.equal(response.shouldEndSession, undefined);
  assert.equal(state.safetyState.phase, "CHECK_IMMEDIATE_DANGER");

  handlerInput = createHandlerInput("AMAZON.YesIntent", state);
  response = SafetyYesIntentHandler.handle(handlerInput);
  assert.equal(response.shouldEndSession, true);
  assert.match(response.outputSpeech, /112/);
  assert.equal(state.safetyState.phase, "FINALIZED");
});

test("NO resumes fiction or ends a confirmed real-world safety flow", () => {
  const fictionalState = createGameState();
  fictionalState.safetyState = {
    state: "UNCERTAIN",
    phase: "OPEN_SAFETY_CHECK",
  };
  let handlerInput = createHandlerInput("AMAZON.NoIntent", fictionalState);

  assert.equal(SafetyNoIntentHandler.canHandle(handlerInput), true);
  let response = SafetyNoIntentHandler.handle(handlerInput);
  assert.equal(response.shouldEndSession, undefined);
  assert.equal(fictionalState.safetyState.state, "NORMAL");
  assert.ok(response.directive);

  const realWorldState = createGameState();
  realWorldState.safetyState = {
    state: "SAFETY_TRIGGERED",
    phase: "CHECK_IMMEDIATE_DANGER",
  };
  handlerInput = createHandlerInput("AMAZON.NoIntent", realWorldState);
  response = SafetyNoIntentHandler.handle(handlerInput);
  assert.equal(response.shouldEndSession, true);
  assert.match(response.outputSpeech, /024/);
  assert.equal(realWorldState.safetyState.phase, "FINALIZED");
});

test("YES and NO do not intercept invalid or finalized safety phases", () => {
  const state = createGameState();
  state.safetyState = { state: "SAFETY_TRIGGERED", phase: "FINALIZED" };

  assert.equal(
    SafetyYesIntentHandler.canHandle(
      createHandlerInput("AMAZON.YesIntent", state),
    ),
    false,
  );
  assert.equal(
    SafetyNoIntentHandler.canHandle(
      createHandlerInput("AMAZON.NoIntent", state),
    ),
    false,
  );
});

test("risk to another person is asked separately and does not offer 024", () => {
  const state = createGameState();
  const question = safetyFlowService.handleSafetyTriggered(state, "OTHERS");

  assert.equal(state.safetyState.questionTarget, "OTHERS");
  assert.match(question.response, /daño a otra persona/);

  safetyFlowService.handleDirectRiskConfirmed(state);
  const emergency = safetyFlowService.handleImmediateDanger(state);

  assert.match(emergency.response, /112/);
  assert.doesNotMatch(emergency.response, /024/);
  assert.equal(emergency.shouldEndSession, true);
});

test("unknown target checks self and others in separate questions", () => {
  const state = createGameState();
  safetyFlowService.handleSafetyTriggered(state, "UNKNOWN");

  assert.equal(state.safetyState.questionTarget, "SELF");
  let result = safetyFlowService.handleDirectRiskDenied(state);
  assert.equal(state.safetyState.questionTarget, "OTHERS");
  assert.match(result.response, /daño a otra persona/);

  result = safetyFlowService.handleDirectRiskDenied(state);
  assert.equal(result.shouldEndSession, true);
  assert.equal(state.safetyState.phase, "FINALIZED");
});

test("an ambiguous direct answer keeps the safety question active", () => {
  const state = createGameState();
  safetyFlowService.handleSafetyTriggered(state, "SELF");
  const result = safetyFlowService.repeatDirectRiskQuestion(state);

  assert.equal(state.safetyState.phase, "DIRECT_RISK_CHECK");
  assert.equal(result.shouldEndSession, false);
  assert.match(result.response, /Necesito preguntarlo claramente/);
});

test("narrative choices are not restored between safety questions", () => {
  const state = createGameState();
  safetyFlowService.handleSafetyTriggered(state, "UNKNOWN");
  const handlerInput = createHandlerInput("AMAZON.NoIntent", state);

  const response = SafetyNoIntentHandler.handle(handlerInput);

  assert.equal(state.safetyState.questionTarget, "OTHERS");
  assert.equal(response.directive, undefined);
  assert.match(response.outputSpeech, /daño a otra persona/);
});

test("ChoiceIntent does not intercept an active safety flow", () => {
  const state = createGameState();
  const normalInput = createHandlerInput("ChoiceIntent", state);

  assert.equal(ChoiceIntentHandler.canHandle(normalInput), true);

  state.safetyState = {
    state: "SAFETY_TRIGGERED",
    phase: "DIRECT_RISK_CHECK",
  };

  assert.equal(ChoiceIntentHandler.canHandle(normalInput), false);
});
