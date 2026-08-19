function applyEvidence(indicators, analysis) {
  for (const item of analysis.evidence) {
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
