const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const progressService = require("../services/progressService");
const progressConfig = require("../config/progressConfig");

test("progression respects turn and exploration thresholds", () => {
  const state = createInitialGameState("progress");

  state.turn = progressConfig.minTurns.development;
  assert.equal(progressService.updateProgress(state), "development");

  state.narrativeState.storyProgress = "development";
  state.turn = progressConfig.minTurns.climax;
  assert.equal(progressService.updateProgress(state), "development");

  Object.values(state.indicators)
    .slice(0, 5)
    .forEach((indicator) => {
      indicator.focusCount = 1;
    });
  assert.equal(progressService.updateProgress(state), "climax");

  state.narrativeState.storyProgress = "climax";
  state.turn = progressConfig.minTurns.resolution;
  assert.equal(progressService.updateProgress(state), "resolution");
});

test("hard limit permits a backend-approved ending", () => {
  const state = createInitialGameState("hard-limit");
  state.turn = progressConfig.maxTurns;

  assert.equal(progressService.hasReachedHardLimit(state), true);
  assert.equal(progressService.canFinishStory(state), true);
});

test("hard limit is not reached one turn before maxTurns", () => {
  const state = createInitialGameState("before-hard-limit");
  state.turn = progressConfig.maxTurns - 1;

  assert.equal(progressService.hasReachedHardLimit(state), false);
});

test("the next scene reaches the limit one turn before maxTurns", () => {
  const state = createInitialGameState("next-scene-hard-limit");
  state.turn = progressConfig.maxTurns - 1;

  assert.equal(progressService.nextSceneReachesHardLimit(state), true);
});

test("the next scene does not reach the limit two turns before maxTurns", () => {
  const state = createInitialGameState("before-next-scene-hard-limit");
  state.turn = progressConfig.maxTurns - 2;

  assert.equal(progressService.nextSceneReachesHardLimit(state), false);
});
