process.loadEnvFile();

const llmService = require("../services/llmService");

async function test() {
  const result = await llmService.generate(`
Genera una escena narrativa breve.

Debe haber exactamente dos opciones.
  `);

  console.log("Gemini test completed:", { hasResult: Boolean(result) });
}

test().catch((error) => {
  console.error("Gemini test failed:", {
    name: error?.name || "Error",
    code: error?.code || null,
  });
});
