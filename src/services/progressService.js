const progressConfig = require("../config/progressConfig");

function updateProgress(gameState) {
  const current = gameState.narrativeState.storyProgress;

  switch (current) {
    case "introduction":
      if (gameState.turn >= progressConfig.minTurns.development) {
        return "development";
      }

      break;

    case "development":
      if (
        gameState.turn >= progressConfig.minTurns.climax &&
        hasEnoughExploration(gameState)
      ) {
        return "climax";
      }

      break;

    case "climax":
      if (gameState.turn >= progressConfig.minTurns.resolution) {
        return "resolution";
      }

      break;

    case "resolution":
      return "resolution";
  }

  return current;
}

function hasEnoughExploration(gameState) {
  const indicators = Object.values(gameState.indicators);

  const exploredIndicators = indicators.filter(
    (indicator) => (indicator.focusCount ?? indicator.explorationCount ?? 0) > 0,
  );

  return exploredIndicators.length >= 5;
}

function hasReachedHardLimit(gameState) {
  return gameState.turn >= progressConfig.maxTurns;
}

function nextSceneReachesHardLimit(gameState) {
  return gameState.turn + 1 >= progressConfig.maxTurns;
}

function canFinishStory(gameState) {
  return (
    gameState.narrativeState.storyProgress === "resolution" ||
    hasReachedHardLimit(gameState)
  );
}

module.exports = {
  updateProgress,
  hasReachedHardLimit,
  nextSceneReachesHardLimit,
  canFinishStory,
};
