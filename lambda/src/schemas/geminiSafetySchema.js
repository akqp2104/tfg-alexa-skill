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

  },

  required: ["state", "riskTarget"],
  additionalProperties: false,
};

module.exports = geminiSafetySchema;
