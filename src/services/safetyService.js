const llmService = require("./llmService");
const safetyResponseSchema = require("../schemas/safetyResponseSchema");
const geminiSafetySchema = require("../schemas/geminiSafetySchema");
const {
  buildSafetyPrompt,
  buildSafetyClarificationPrompt,
} = require("../prompts/safetyPrompt");

async function analyze({ userInput, narrativeState, currentChoices }) {
  const prompt = buildSafetyPrompt(userInput, narrativeState, currentChoices);

  return llmService.generate({
    prompt,
    responseJsonSchema: geminiSafetySchema,
    zodSchema: safetyResponseSchema,
    task: "safety_analysis",
  });
}

async function analyzeClarification({ clarification, safetyState }) {
  const prompt = buildSafetyClarificationPrompt(clarification, safetyState);

  return llmService.generate({
    prompt,
    responseJsonSchema: geminiSafetySchema,
    zodSchema: safetyResponseSchema,
    task: "safety_clarification",
  });
}

module.exports = {
  analyze,
  analyzeClarification,
};
