function applyEvidence(indicators, analysis) {
  const evidenceByIndicator = new Map();

  for (const item of analysis.evidence) {
    const current = evidenceByIndicator.get(item.indicator);

    // Una respuesta del LLM puede repetir un indicador. Conservamos solo la
    // evidencia con mayor peso para que el turno se contabilice una sola vez.
    if (!current || item.scoreDelta > current.scoreDelta) {
      evidenceByIndicator.set(item.indicator, {
        indicator: item.indicator,
        scoreDelta: item.scoreDelta,
      });
    }

    delete item.evidence;
  }

  for (const item of evidenceByIndicator.values()) {
    const indicator = indicators[item.indicator];

    if (!indicator) {
      console.warn("Unknown indicator:", item.indicator);

      continue;
    }

    if (item.scoreDelta <= 0) {
      continue;
    }

    indicator.score += item.scoreDelta;
    indicator.evidenceCount += 1;
  }

  return indicators;
}

module.exports = {
  applyEvidence,
};
