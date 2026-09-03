const test = require("node:test");
const assert = require("node:assert/strict");

const { buildIndicatorPrompt } = require("../prompts/indicatorPrompt");

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
