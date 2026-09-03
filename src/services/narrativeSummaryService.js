const llmService = require("./llmService");
const narrativeSummaryResponseSchema = require("../schemas/narrativeSummaryResponseSchema");
const geminiNarrativeSummarySchema = require("../schemas/geminiNarrativeSummarySchema");
const { buildSummaryPrompt } = require("../prompts/summaryPrompt");

async function updateSummary(gameState) {
  const prompt = buildSummaryPrompt({
    previousSummary: gameState.narrativeSummary,

    narrativeState: gameState.narrativeState,
  });

  const result = await llmService.generate({
    prompt,

    responseJsonSchema: geminiNarrativeSummarySchema,

    zodSchema: narrativeSummaryResponseSchema,

    task: "narrative_summary",

    maxOutputTokens: 600,

    normalizer: normalizeSummaryCandidate,
  });

  return result.narrativeSummary;
}

function normalizeSummaryCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  return {
    ...candidate,
    narrativeSummary:
      typeof candidate.narrativeSummary === "string"
        ? candidate.narrativeSummary.trim().slice(0, 2000)
        : candidate.narrativeSummary,
  };
}

module.exports = {
  updateSummary,
  normalizeSummaryCandidate,
};
