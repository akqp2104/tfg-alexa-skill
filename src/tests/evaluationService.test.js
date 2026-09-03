const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const evaluationService = require("../services/evaluationService");
const evaluationResponseService = require("../services/evaluationResponseService");

test("evaluation distinguishes unexplored indicators", () => {
  const result = evaluationService.evaluateIndicator({
    score: 0,
    evidenceCount: 0,
    focusCount: 0,
  });

  assert.deepEqual(result, {
    status: "not_explored",
    level: "none",
    score: 0,
    evidenceCount: 0,
    explorationCount: 0,
    averageStrength: 0,
    priority: 0,
  });
});

test("evaluation distinguishes explored indicators without repeated evidence", () => {
  const result = evaluationService.evaluateIndicator({
    score: 1,
    evidenceCount: 1,
    focusCount: 3,
  });

  assert.equal(result.status, "no_repeated_evidence");
  assert.equal(result.level, "none");
  assert.equal(result.explorationCount, 3);
  assert.equal(result.averageStrength, 1);
  assert.equal(result.priority, 0);
});

test("evaluation marks repeated evidence as relevant", () => {
  const result = evaluationService.evaluateIndicator({
    score: 3,
    evidenceCount: 2,
    focusCount: 4,
  });

  assert.equal(result.status, "relevant");
  assert.equal(result.level, "low");
  assert.equal(result.explorationCount, 4);
  assert.equal(result.averageStrength, 1.5);
  assert.equal(result.priority, 6.5);
});

test("evaluation assigns LOW at its exact evidence threshold", () => {
  const result = evaluationService.evaluateIndicator({
    score: 2,
    evidenceCount: 2,
    focusCount: 2,
  });

  assert.equal(result.status, "relevant");
  assert.equal(result.level, "low");
});

test("evaluation does not assign MODERATE below its score threshold", () => {
  const result = evaluationService.evaluateIndicator({
    score: 3,
    evidenceCount: 3,
    focusCount: 3,
  });

  assert.equal(result.level, "low");
});

test("evaluation does not assign MODERATE below its evidence threshold", () => {
  const result = evaluationService.evaluateIndicator({
    score: 4,
    evidenceCount: 2,
    focusCount: 2,
  });

  assert.equal(result.level, "low");
});

test("evaluation assigns MODERATE at its exact threshold", () => {
  const result = evaluationService.evaluateIndicator({
    score: 4,
    evidenceCount: 3,
    focusCount: 3,
  });

  assert.equal(result.level, "moderate");
});

test("evaluation does not assign HIGH below its score threshold", () => {
  const result = evaluationService.evaluateIndicator({
    score: 5,
    evidenceCount: 4,
    focusCount: 4,
  });

  assert.equal(result.level, "moderate");
});

test("evaluation does not assign HIGH below its evidence threshold", () => {
  const result = evaluationService.evaluateIndicator({
    score: 6,
    evidenceCount: 3,
    focusCount: 3,
  });

  assert.equal(result.level, "moderate");
});

test("evaluation assigns HIGH at its exact threshold", () => {
  const result = evaluationService.evaluateIndicator({
    score: 6,
    evidenceCount: 4,
    focusCount: 4,
  });

  assert.equal(result.level, "high");
});

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

test("game evaluation orders relevant indicators by priority", () => {
  const state = createInitialGameState("evaluation-priority");
  state.indicators.worry = {
    score: 4,
    evidenceCount: 3,
    focusCount: 3,
  };
  state.indicators.avoidance = {
    score: 6,
    evidenceCount: 4,
    focusCount: 4,
  };
  state.indicators.lowEnergy = {
    score: 2,
    evidenceCount: 2,
    focusCount: 2,
  };

  const evaluation = evaluationService.evaluateGame(state);

  assert.deepEqual(
    evaluation.relevantIndicators.map(({ indicator }) => indicator),
    ["avoidance", "worry", "lowEnergy"],
  );
  assert.ok(
    evaluation.relevantIndicators[0].priority >
      evaluation.relevantIndicators[1].priority,
  );
  assert.ok(
    evaluation.relevantIndicators[1].priority >
      evaluation.relevantIndicators[2].priority,
  );
});

test("the final response warns when some dimensions were not explored", () => {
  const evaluation = evaluationService.evaluateGame(
    createInitialGameState("evaluation-response"),
  );
  const response = evaluationResponseService.buildFinalResponse(evaluation);

  assert.match(response, /no se exploraron lo suficiente/);
  assert.match(response, /no constituye una evaluación clínica/);
});
