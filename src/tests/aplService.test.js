const test = require("node:test");
const assert = require("node:assert/strict");

const aplService = require("../services/aplService");

function createHandlerInput(maxVersion = null) {
  return {
    requestEnvelope: {
      context: {
        System: {
          device: {
            supportedInterfaces: maxVersion
              ? {
                  "Alexa.Presentation.APL": {
                    runtime: { maxVersion },
                  },
                }
              : {},
          },
        },
      },
    },
  };
}

function createResponseBuilder() {
  return {
    directives: [],
    addDirective(directive) {
      this.directives.push(directive);
      return this;
    },
  };
}

const choices = [
  { text: "Hablar con Marta" },
  { text: "Salir de la cafetería" },
];

test("speech marks require APL 2023.1 or later", () => {
  assert.equal(aplService.supportsAplSpeech(createHandlerInput("2024.3")), true);
  assert.equal(aplService.supportsAplSpeech(createHandlerInput("2023.1")), true);
  assert.equal(aplService.supportsAplSpeech(createHandlerInput("1.7")), false);
  assert.equal(aplService.supportsAplSpeech(createHandlerInput()), false);
});

test("compatible devices receive APL speech without estimated delays", () => {
  const responseBuilder = createResponseBuilder();
  const used = aplService.addSpokenChoicesDocument(
    createHandlerInput("2024.3"),
    responseBuilder,
    choices,
    "choices-turn-2",
    "Marta se acerca. Tus opciones son: hablar o salir.",
  );

  assert.equal(used, true);
  assert.equal(responseBuilder.directives.length, 1);
  const directive = responseBuilder.directives[0];
  assert.equal(directive.document.version, "2023.1");
  const mountSequence = directive.document.mainTemplate.item.onMount[0];
  assert.equal(mountSequence.type, "Sequential");
  assert.equal(mountSequence.sequencer, "NarrationSequencer");
  assert.equal(mountSequence.screenLock, true);
  assert.equal(
    mountSequence.when,
    undefined,
  );
  assert.equal(mountSequence.commands[0].type, "SpeakItem");
  assert.equal(mountSequence.commands[0].componentId, "speechDriver");
  assert.equal(mountSequence.commands[1].type, "Idle");
  assert.equal(mountSequence.commands[1].delay, 400);
  assert.equal(mountSequence.commands[2].type, "SendEvent");
  assert.deepEqual(mountSequence.commands[2].arguments, [
    "narration-complete",
  ]);
  const [speechDriver, panel] = directive.document.mainTemplate.item.items;
  assert.equal(speechDriver.id, "speechDriver");
  assert.equal(speechDriver.speech, "${payload.choices.properties.speech}");
  assert.equal(speechDriver.onSpeechMark[0].componentId, "choicesPanel");
  assert.equal(panel.opacity, 0);
  assert.match(
    directive.datasources.choices.properties.narrationSsml,
    /<mark name="show-options"\/>Tus opciones son/,
  );
  assert.equal(
    directive.datasources.choices.transformers[0].transformer,
    "ssmlToSpeech",
  );
});

test("marked SSML escapes generated text safely", () => {
  assert.equal(
    aplService.buildMarkedSsml("A & B. Tus opciones son: entrar <ya>."),
    '<speak>A &amp; B. <mark name="show-options"/>Tus opciones son: entrar &lt;ya&gt;.</speak>',
  );
});

test("incompatible devices fall back instead of adding APL speech", () => {
  const responseBuilder = createResponseBuilder();
  const used = aplService.addSpokenChoicesDocument(
    createHandlerInput("1.7"),
    responseBuilder,
    choices,
    "choices-turn-2",
    "Escena. Tus opciones son: hablar o salir.",
  );

  assert.equal(used, false);
  assert.deepEqual(responseBuilder.directives, []);
});

test("static choice documents remain available when resuming safety flow", () => {
  const responseBuilder = createResponseBuilder();

  aplService.addChoicesDocument(
    createHandlerInput("1.7"),
    responseBuilder,
    choices,
    "choices-turn-2",
  );

  assert.equal(responseBuilder.directives.length, 1);
  assert.equal(responseBuilder.directives[0].document.version, "1.0");
  assert.equal(
    responseBuilder.directives[0].document.mainTemplate.item.items[0].opacity,
    1,
  );
});
