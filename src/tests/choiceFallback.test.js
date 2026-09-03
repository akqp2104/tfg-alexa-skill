const test = require("node:test");
const assert = require("node:assert/strict");

const choiceService = require("../services/choiceService");
const FallbackIntentHandler = require("../handlers/FallbackIntentHandler");

const choices = [
  {
    id: "call",
    text: "Llamar a Marta",
    synonyms: ["llamar", "telefonear a Marta"],
  },
  {
    id: "leave",
    text: "Salir de la cafetería",
    synonyms: ["salir", "abandonar la cafetería"],
  },
];

function createHandlerInput(intentName = "AMAZON.FallbackIntent") {
  const response = { directives: [] };

  return {
    requestEnvelope: {
      request: { type: "IntentRequest", intent: { name: intentName } },
      context: { System: { device: { supportedInterfaces: {} } } },
    },
    attributesManager: {
      getSessionAttributes() {
        return {
          gameState: {
            turn: 2,
            currentChoices: choices,
            safetyState: { state: "NORMAL" },
          },
        };
      },
    },
    responseBuilder: {
      addDirective(directive) {
        response.directives.push(directive);
        return this;
      },
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
      getResponse() {
        return response;
      },
    },
  };
}

test("dynamic choices include numeric aliases but omit isolated commands", () => {
  const directive = choiceService.buildDynamicEntitiesDirective(choices);
  const [first, second] = directive.types[0].values;

  assert.ok(first.name.synonyms.includes("opción uno"));
  assert.ok(first.name.synonyms.includes("la primera"));
  assert.ok(!first.name.synonyms.includes("llamar"));
  assert.ok(second.name.synonyms.includes("opción dos"));
  assert.ok(!second.name.synonyms.includes("salir"));
});

test("fallback repeats current choices and keeps the session open", () => {
  const handlerInput = createHandlerInput();

  assert.equal(FallbackIntentHandler.canHandle(handlerInput), true);
  const response = FallbackIntentHandler.handle(handlerInput);

  assert.match(response.outputSpeech, /opción uno: Llamar a Marta/);
  assert.match(response.outputSpeech, /elijo seguido de una opción/);
  assert.equal(response.shouldEndSession, false);
  assert.equal(response.directives[0].type, "Dialog.UpdateDynamicEntities");
});
