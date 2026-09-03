const { z } = require("zod");

const indicatorNames = [
  "lowMood",
  "anhedonia",
  "lowEnergy",
  "lowSelfWorth",
  "socialWithdrawal",
  "worry",
  "tension",
  "avoidance",
  "somaticAnxiety",
  "sleepDisturbance",
  "concentrationDifficulty",
];

const indicatorEvidenceSchema = z.object({
  indicator: z.enum(indicatorNames),
  scoreDelta: z.number().int().min(1).max(2), // 1: evidencia limitada, 2: evidencia clara
  evidence: z.string().min(1).max(250),
});

const indicatorAnalysisSchema = z.object({
  evidence: z.array(indicatorEvidenceSchema).max(3),
});

module.exports = indicatorAnalysisSchema;
