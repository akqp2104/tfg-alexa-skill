function buildSafetyContext(narrativeState = {}) {
  return {
    scene: narrativeState.scene ?? null,
    location: narrativeState.location ?? null,
    recentEvents: lastItems(narrativeState.recentEvents, 2),
  };
}

function buildIndicatorContext(narrativeState = {}) {
  return {
    scene: narrativeState.scene ?? null,
    characterGoal: narrativeState.characterGoal ?? null,
    recentEvents: lastItems(narrativeState.recentEvents, 3),
  };
}

function buildChoiceContext(currentChoices = []) {
  return currentChoices.map(({ id, text }) => ({ id, text }));
}

function lastItems(value, maximum) {
  return Array.isArray(value) ? value.slice(-maximum) : [];
}

module.exports = {
  buildSafetyContext,
  buildIndicatorContext,
  buildChoiceContext,
};
