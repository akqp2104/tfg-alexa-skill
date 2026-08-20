const test = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../handlers/AplNarrationCompleteHandler");

function createHandlerInput(argument = "narration-complete") {
  const response = {};

  return {
    requestEnvelope: {
      request: {
        type: "Alexa.Presentation.APL.UserEvent",
        arguments: [argument],
      },
    },
    attributesManager: {
      getSessionAttributes() {
        return {
          gameState: {
            turn: 2,
            currentChoices: [
              { text: "Hablar con Marta" },
              { text: "Salir de la cafetería" },
            ],
          },
        };
      },
    },
    responseBuilder: {
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

test("handles only the APL event sent after narration", () => {
  assert.equal(handler.canHandle(createHandlerInput()), true);
  assert.equal(handler.canHandle(createHandlerInput("another-event")), false);
});

test("opens the microphone only after APL narration completes", () => {
  const response = handler.handle(createHandlerInput());

  assert.equal(response.outputSpeech, undefined);
  assert.match(response.reprompt, /Hablar con Marta/);
  assert.equal(response.shouldEndSession, false);
});
