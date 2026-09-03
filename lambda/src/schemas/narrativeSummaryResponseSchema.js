const { z } = require("zod");

const narrativeSummaryResponseSchema = z.object({
  narrativeSummary: z.string().min(1).max(2000),
});

module.exports = narrativeSummaryResponseSchema;
