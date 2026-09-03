function buildSummaryPrompt({ previousSummary, narrativeState }) {
  return `
Actualiza el resumen compacto de una historia interactiva.

RESUMEN ANTERIOR:
${JSON.stringify(previousSummary)}

ESTADO ACTUAL:
${JSON.stringify(narrativeState)}

Conserva solo lo necesario para continuar con coherencia: acontecimientos y decisiones con
consecuencias, personajes, relaciones, conflictos, compromisos, objetivos y cambios relevantes.
Incorpora los eventos recientes importantes y elimina detalles que ya no afecten a la historia.
- Resume únicamente acontecimientos de la ficción.
- No incorpores información sobre la identidad real del usuario.
- No incluyas datos personales proporcionados accidentalmente por el usuario.
No inventes, diagnostiques, menciones indicadores o safetyState ni atribuyas datos al usuario real.
Escribe un único resumen conciso en español.
  `.trim();
}

module.exports = { buildSummaryPrompt };
