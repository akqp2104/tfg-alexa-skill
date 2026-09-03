const test = require("node:test");
const assert = require("node:assert/strict");

const contextService = require("../services/llmContextService");

const narrativeState = {
  scene: "cafetería",
  location: "Granada",
  characterGoal: "aclarar el malentendido",
  relationships: { Marta: { trust: 2, tension: 1 } },
  openConflicts: ["conflicto extenso"],
  recentEvents: ["uno", "dos", "tres", "cuatro"],
};

test("safety receives only immediate fictional context", () => {
  assert.deepEqual(contextService.buildSafetyContext(narrativeState), {
    scene: "cafetería",
    location: "Granada",
    recentEvents: ["tres", "cuatro"],
  });
});

test("indicator analysis receives only choice interpretation context", () => {
  assert.deepEqual(contextService.buildIndicatorContext(narrativeState), {
    scene: "cafetería",
    characterGoal: "aclarar el malentendido",
    recentEvents: ["dos", "tres", "cuatro"],
  });
});

test("choice context excludes synonyms and unrelated properties", () => {
  assert.deepEqual(
    contextService.buildChoiceContext([
      { id: "talk", text: "Hablar", synonyms: ["conversar"], metadata: true },
    ]),
    [{ id: "talk", text: "Hablar" }],
  );
});
