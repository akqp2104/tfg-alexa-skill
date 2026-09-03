const llmService = require("./llmService");
const indicatorAnalysisSchema = require("../schemas/indicatorAnalysisSchema");
const geminiIndicatorSchema = require("../schemas/geminiIndicatorSchema");
const { buildIndicatorPrompt } = require("../prompts/indicatorPrompt");
const {
  buildIndicatorContext,
  buildChoiceContext,
} = require("./llmContextService");

function createIndicatorAnalysisService({ llm = llmService } = {}) {
  async function analyze({ userInput, narrativeState, currentChoices }) {
    const prompt = buildIndicatorPrompt({
      userInput,
      narrativeState: buildIndicatorContext(narrativeState),
      currentChoices: buildChoiceContext(currentChoices),
    });

    return llm.generate({
      prompt,
      responseJsonSchema: geminiIndicatorSchema,
      zodSchema: indicatorAnalysisSchema,
      task: "indicator_analysis",
    });
  }

  return { analyze };
}

const defaultIndicatorAnalysisService = createIndicatorAnalysisService();

module.exports = {
  ...defaultIndicatorAnalysisService,
  createIndicatorAnalysisService,
};
