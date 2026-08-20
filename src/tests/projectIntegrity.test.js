const test = require("node:test");
const assert = require("node:assert/strict");

const ErrorHandler = require("../handlers/ErrorHandler");
const storySeedService = require("../services/storySeedService");

function createResponseBuilder() {
  const response = {};

  return {
    response,
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
  };
}

test("semantic LLM errors use the specific terminating response", () => {
  const responseBuilder = createResponseBuilder();
  const error = new Error("LLM_SEMANTIC_INVALID");
  error.code = "LLM_SEMANTIC_INVALID";

  const response = ErrorHandler.handle({ responseBuilder }, error);

  assert.equal(response.shouldEndSession, true);
  assert.match(response.outputSpeech, /problema al generar la historia/);
});

test("story seeds consistently use the singular stake property", () => {
  const seed = storySeedService.generateStorySeed();

  assert.equal(typeof seed.stake, "string");
  assert.equal("stakes" in seed, false);
});

test("story seed validation applies rules involving stake", () => {
  assert.equal(
    storySeedService.isValidSeed({
      socialContext: "está tratando con una persona desconocida",
      stake: "mantener un compromiso",
    }),
    false,
  );
});
