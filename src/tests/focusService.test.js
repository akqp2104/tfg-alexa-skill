const test = require("node:test");
const assert = require("node:assert/strict");

const createInitialGameState = require("../state/createInitialGameState");
const focusService = require("../services/focusService");
const { buildNextScenePrompt } = require("../prompts/narrativePrompt");

test("selectFocus prioritizes existing evidence", () => {
  const indicators = createInitialGameState("test").indicators;
  indicators.worry.score = 2;
  indicators.worry.evidenceCount = 1;

  assert.equal(focusService.selectFocus(indicators), "worry");
});

test("registerFocusSelection increments only the selected focus", () => {
  const indicators = createInitialGameState("test").indicators;

  focusService.registerFocusSelection(indicators, "lowMood");
  focusService.registerFocusSelection(indicators, "lowMood");

  assert.equal(indicators.lowMood.focusCount, 2);
  assert.equal(indicators.anhedonia.focusCount, 0);
});

test("selectFocus does not repeat the previous focus", () => {
  const indicators = createInitialGameState("test").indicators;
  indicators.worry.score = 2;
  indicators.worry.evidenceCount = 1;

  assert.notEqual(focusService.selectFocus(indicators, "worry"), "worry");
});

test("the selected focus and its instructions reach the narrative prompt", () => {
  const prompt = buildNextScenePrompt(
    { narrativeState: { scene: "cafeteria" } },
    { rawText: "Esperar", resolvedChoice: { id: "wait" } },
    "socialWithdrawal",
  );

  assert.match(prompt, /Foco de exploración:\s*socialWithdrawal/);
  assert.match(prompt, /oportunidad natural de interacción social/);
});
