const geminiNarrativeSummarySchema = {
  type: "object",
  properties: {
    narrativeSummary: {
      type: "string",
      description:
        "Resumen acumulado y conciso de la historia, máximo 2000 caracteres.",
    },
  },
  required: ["narrativeSummary"],
  additionalProperties: false,
};

module.exports = geminiNarrativeSummarySchema;
