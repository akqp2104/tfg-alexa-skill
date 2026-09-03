const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const evaluationService = require("../services/evaluationService");
const evaluationResponseService = require("../services/evaluationResponseService");

test("game evaluation distinguishes coverage from absence of evidence", () => {
  const state = createInitialGameState("evaluation-coverage");
  state.indicators.worry = {
    score: 4,
    evidenceCount: 3,
    focusCount: 4,
  };

  const evaluation = evaluationService.evaluateGame(state);

  assert.equal(evaluation.indicatorResults.worry.status, "relevant");
  assert.equal(evaluation.indicatorResults.worry.level, "moderate");
  assert.equal(evaluation.indicatorResults.worry.explorationCount, 4);
  assert.equal(
    evaluation.indicatorResults.sleepDisturbance.status,
    "not_explored",
  );
  assert.equal(evaluation.exploredIndicators, 1);
  assert.equal(evaluation.totalIndicators, 11);
  assert.equal(evaluation.relevantIndicators[0].indicator, "worry");
});

test("the final response warns when some dimensions were not explored", () => {
  const evaluation = evaluationService.evaluateGame(
    createInitialGameState("evaluation-response"),
  );
  const response = evaluationResponseService.buildFinalResponse(evaluation);

  assert.match(response, /no se exploraron lo suficiente/);
  assert.match(response, /no constituye una evaluación clínica/);
});
