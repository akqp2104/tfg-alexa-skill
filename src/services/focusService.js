const INDICATOR_NAMES = [
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

function selectFocus(indicators, previousFocus = null) {
  const candidates = INDICATOR_NAMES.map((name) => {
    const indicator = indicators[name];

    return {
      name,
      score: indicator.score || 0,
      evidenceCount: indicator.evidenceCount || 0,
      focusCount: getFocusCount(indicator),
      priority: calculatePriority(indicator),
    };
  });

  // Evita crear dos escenas consecutivas alrededor del mismo indicador.
  const eligibleCandidates = candidates.filter(
    (candidate) => candidate.name !== previousFocus,
  );

  const maxPriority = Math.max(
    ...eligibleCandidates.map((candidate) => candidate.priority),
  );

  const topCandidates = eligibleCandidates.filter(
    (candidate) => candidate.priority >= maxPriority - 0.5,
  );

  return topCandidates[Math.floor(Math.random() * topCandidates.length)].name;
}

function calculatePriority(indicator) {
  const score = Math.min(indicator.score || 0, 4);
  const evidenceCount = Math.min(indicator.evidenceCount || 0, 3);
  const focusCount = getFocusCount(indicator);

  // Priorizar señales que ya han aparecido;
  // Favorecer dimensiones poco exploradas;
  // Penalizar las dimensiones que se han explorado muchas veces.

  return score * 2 + evidenceCount - focusCount * 1.5;
}

function registerFocusSelection(indicators, focus) {
  if (!indicators[focus]) {
    return;
  }

  indicators[focus].focusCount = getFocusCount(indicators[focus]) + 1;
  delete indicators[focus].explorationCount;
}

function getFocusCount(indicator) {
  return indicator.focusCount ?? indicator.explorationCount ?? 0;
}

module.exports = {
  selectFocus,
  registerFocusSelection,
};
