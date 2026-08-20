const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const indicatorService = require("../services/indicatorService");
const evaluationService = require("../services/evaluationService");
const { buildIndicatorPrompt } = require("../prompts/indicatorPrompt");

test("evaluate reads scores from indicator state", () => {
  const indicators = createInitialGameState("test").indicators;
  indicators.lowEnergy.score = 2;
  indicators.socialWithdrawal.score = 1;

  assert.deepEqual(evaluationService.evaluate(indicators), {
    lowEnergyScore: 2,
    ruminationScore: 0,
    socialWithdrawalScore: 1,
    socialConnectionScore: 0,
  });
});

test("an indicator is counted only once per turn", () => {
  const indicators = createInitialGameState("test").indicators;

  indicatorService.applyEvidence(indicators, {
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
  });

  assert.deepEqual(indicators.lowEnergy, {
    score: 2,
    evidenceCount: 1,
    focusCount: 0,
  });
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
  assert.match(prompt, /Compara la opción elegida con las demás opciones/);
  assert.match(prompt, /contexto únicamente para interpretar/);
});
