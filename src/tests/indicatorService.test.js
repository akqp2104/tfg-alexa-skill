const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const indicatorService = require("../services/indicatorService");

test("an indicator is counted only once per turn", () => {
  const indicators = createInitialGameState("test").indicators;

  const analysis = {
    evidence: [
      {
        indicator: "lowEnergy",
        scoreDelta: 1,
        evidence: "Dice que le cuesta empezar.",
      },
      {
        indicator: "lowEnergy",
        scoreDelta: 2,
        evidence: "Expresa cansancio de forma explícita.",
      },
    ],
  };

  indicatorService.applyEvidence(indicators, analysis);

  assert.deepEqual(indicators.lowEnergy, {
    score: 2,
    evidenceCount: 1,
    focusCount: 0,
  });
  assert.equal("evidence" in analysis.evidence[0], false);
  assert.equal("evidence" in analysis.evidence[1], false);
  assert.equal(JSON.stringify(indicators).includes("Dice que"), false);
});

test("scores from different turns are accumulated", () => {
  const indicators = createInitialGameState("test").indicators;

  indicatorService.applyEvidence(indicators, {
    evidence: [
      { indicator: "worry", scoreDelta: 1, evidence: "Anticipa problemas." },
    ],
  });
  indicatorService.applyEvidence(indicators, {
    evidence: [
      { indicator: "worry", scoreDelta: 2, evidence: "Expresa preocupación." },
    ],
  });

  assert.equal(indicators.worry.score, 3);
  assert.equal(indicators.worry.evidenceCount, 2);
});
