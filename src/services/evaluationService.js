function evaluate(indicators = {}) {
  return {
    lowEnergyScore: indicators.lowEnergy || 0,
    ruminationScore: indicators.rumination || 0,
    socialWithdrawalScore: indicators.socialWithdrawal || 0,
    socialConnectionScore: indicators.socialConnection || 0,
  };
}

function buildSummary(evaluation) {
  const parts = [];

  if (evaluation.lowEnergyScore > 0) {
    parts.push("se han registrado decisiones asociadas a baja energía");
  }

  if (evaluation.ruminationScore > 0) {
    parts.push("se han registrado decisiones asociadas a rumiación");
  }

  if (evaluation.socialWithdrawalScore > 0) {
    parts.push("se han registrado decisiones asociadas a aislamiento social");
  }

  if (evaluation.socialConnectionScore > 0) {
    parts.push("se han registrado decisiones asociadas a conexión social");
  }

  if (parts.length === 0) {
    return "No se han registrado indicadores destacables en esta partida.";
  }

  return `Durante la historia, ${parts.join(", ")}.`;
}

module.exports = {
  evaluate,
  buildSummary,
};
