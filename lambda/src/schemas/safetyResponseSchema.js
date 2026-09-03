const { z } = require("zod");

const safetyResponseSchema = z.object({
  state: z.enum(["NORMAL", "UNCERTAIN", "SAFETY_TRIGGERED"]),
  riskTarget: z.enum(["NONE", "SELF", "OTHERS", "BOTH", "UNKNOWN"]),
});

module.exports = safetyResponseSchema;
