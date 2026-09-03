// src/services/indicatorAnalysisService.js

const llmService = require("./llmService");
const indicatorAnalysisSchema = require("../schemas/indicatorAnalysisSchema");
const geminiIndicatorSchema = require("../schemas/geminiIndicatorSchema");
const { buildIndicatorPrompt } = require("../prompts/indicatorPrompt");
const {
  buildIndicatorContext,
  buildChoiceContext,
} = require("./llmContextService");

async function analyze({ userInput, narrativeState, currentChoices }) {
  const prompt = buildIndicatorPrompt({
    userInput,
    narrativeState: buildIndicatorContext(narrativeState),
    currentChoices: buildChoiceContext(currentChoices),
  });

  return llmService.generate({
    prompt,
    responseJsonSchema: geminiIndicatorSchema,
    zodSchema: indicatorAnalysisSchema,
    task: "indicator_analysis",
  });
}

module.exports = {
  analyze,
};
