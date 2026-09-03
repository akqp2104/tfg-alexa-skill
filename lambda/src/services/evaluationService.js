const evaluationConfig = require("../config/evaluationConfig");

function evaluateGame(gameState) {
  const indicatorResults = {};

  for (const [name, indicator] of Object.entries(gameState.indicators)) {
    indicatorResults[name] = evaluateIndicator(indicator);
  }

  const relevantIndicators = Object.entries(indicatorResults)
    .filter(
      ([, result]) => result.status === evaluationConfig.statuses.RELEVANT,
    )
    .sort((a, b) => b[1].priority - a[1].priority)
    .map(([name, result]) => ({
      indicator: name,
      ...result,
    }));

  return {
    indicatorResults,

    relevantIndicators,

    exploredIndicators: countExploredIndicators(gameState.indicators),

    totalIndicators: Object.keys(gameState.indicators).length,
  };
}

function evaluateIndicator(indicator) {
  const score = indicator.score || 0;

  const evidenceCount = indicator.evidenceCount || 0;

  const explorationCount =
    indicator.focusCount ?? indicator.explorationCount ?? 0;

  const averageStrength = calculateAverageStrength(score, evidenceCount);

  if (explorationCount === 0) {
    return {
      status: evaluationConfig.statuses.NOT_EXPLORED,
      level: evaluationConfig.levels.NONE,
      score,
      evidenceCount,
      explorationCount,
      averageStrength: 0,
      priority: 0,
    };
  }

  if (evidenceCount < evaluationConfig.minimumEvidenceCount) {
    return {
      status: evaluationConfig.statuses.NO_REPEATED_EVIDENCE,
      level: evaluationConfig.levels.NONE,
      score,
      evidenceCount,
      explorationCount,
      averageStrength,
      priority: 0,
    };
  }

  return {
    status: evaluationConfig.statuses.RELEVANT,
    level: calculateLevel({
      score,
      evidenceCount,
      averageStrength,
    }),

    score,
    evidenceCount,
    explorationCount,
    averageStrength,

    priority: calculatePriority({
      score,
      evidenceCount,
      averageStrength,
    }),
  };
}

function calculateAverageStrength(score, evidenceCount) {
  if (evidenceCount === 0) {
    return 0;
  }

  return Number((score / evidenceCount).toFixed(2));
}

function calculateLevel({ score, evidenceCount }) {
  const { NONE, LOW, MODERATE, HIGH } = evaluationConfig.levels;

  if (evidenceCount < 2) {
    return NONE;
  }

  if (evidenceCount >= 4 && score >= 6) {
    return HIGH;
  }

  if (evidenceCount >= 3 && score >= 4) {
    return MODERATE;
  }

  return LOW;
}

function calculatePriority({ score, evidenceCount, averageStrength }) {
  return score + evidenceCount + averageStrength;
}

function countExploredIndicators(indicators) {
  return Object.values(indicators).filter(
    (indicator) =>
      (indicator.focusCount ?? indicator.explorationCount ?? 0) > 0,
  ).length;
}

module.exports = {
  evaluateGame,
  evaluateIndicator,
};
