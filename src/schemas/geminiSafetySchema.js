const geminiSafetySchema = {
  type: "object",

  properties: {
    state: {
      type: "string",
      enum: ["NORMAL", "UNCERTAIN", "SAFETY_TRIGGERED"],
    },

    riskTarget: {
      type: "string",
      enum: ["NONE", "SELF", "OTHERS", "BOTH", "UNKNOWN"],
    },

    reason: {
      type: "string",
    },
  },

  required: ["state", "riskTarget", "reason"],
};

module.exports = geminiSafetySchema;
