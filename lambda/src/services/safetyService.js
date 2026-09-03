const llmService = require("./llmService");
const safetyResponseSchema = require("../schemas/safetyResponseSchema");
const geminiSafetySchema = require("../schemas/geminiSafetySchema");
const {
  buildSafetyPrompt,
  buildSafetyClarificationPrompt,
} = require("../prompts/safetyPrompt");
const {
  buildSafetyContext,
  buildChoiceContext,
} = require("./llmContextService");

function createSafetyService({ llm = llmService } = {}) {
  async function analyze({ userInput, narrativeState, currentChoices }) {
    const prompt = buildSafetyPrompt(
      userInput,
      buildSafetyContext(narrativeState),
      buildChoiceContext(currentChoices),
    );

    return llm.generate({
      prompt,
      responseJsonSchema: geminiSafetySchema,
      zodSchema: safetyResponseSchema,
      task: "safety_analysis",
    });
  }

  async function analyzeClarification({ clarification, safetyState }) {
    const prompt = buildSafetyClarificationPrompt(clarification, safetyState);

    return llm.generate({
      prompt,
      responseJsonSchema: geminiSafetySchema,
      zodSchema: safetyResponseSchema,
      task: "safety_clarification",
    });
  }

  return {
    analyze,
    analyzeClarification,
  };
}

const defaultSafetyService = createSafetyService();

module.exports = {
  ...defaultSafetyService,
  createSafetyService,
};
