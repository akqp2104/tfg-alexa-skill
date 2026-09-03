const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const indicatorService = require("../services/indicatorService");
const evaluationService = require("../services/evaluationService");
const { buildIndicatorPrompt } = require("../prompts/indicatorPrompt");

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

test("the indicator prompt allows contextual interpretation of choices", () => {
  const prompt = buildIndicatorPrompt({
    userInput: {
      rawText: "Prefiero quedarme solo",
      resolvedChoice: { id: "stay", name: "Quedarse solo" },
    },
    narrativeState: { scene: "reunion" },
    currentChoices: [
      { id: "stay", text: "Quedarse solo" },
      { id: "join", text: "Reunirse con los demás" },
    ],
  });

  assert.match(prompt, /Una elección aislada puede aportar evidencia/);
  assert.match(prompt, /frente a las alternativas/);
  assert.match(prompt, /hechos inventados por la narración/);
});
