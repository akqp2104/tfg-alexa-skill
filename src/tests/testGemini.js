process.loadEnvFile();

const llmService = require("../services/llmService");

async function test() {
  const result = await llmService.generate(`
Genera una escena narrativa breve.

Debe haber exactamente dos opciones.
  `);

  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
