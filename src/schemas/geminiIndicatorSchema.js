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

const geminiIndicatorSchema = {
  type: "object",

  properties: {
    evidence: {
      type: "array",
      maxItems: 3,

      items: {
        type: "object",

        properties: {
          indicator: {
            type: "string",
            enum: indicatorNames,
          },

          scoreDelta: {
            type: "integer",
            minimum: 1,
            maximum: 2,
          },

          evidence: {
            type: "string",
          },
        },

        required: ["indicator", "scoreDelta", "evidence"],
      },
    },
  },

  required: ["evidence"],
};

module.exports = geminiIndicatorSchema;
