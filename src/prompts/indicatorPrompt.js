// src/prompts/indicatorPrompt.js

function buildIndicatorPrompt({ userInput, narrativeState, currentChoices }) {
  return `
Analiza la respuesta del jugador dentro de una historia interactiva.

Tu tarea es detectar únicamente evidencia útil para actualizar indicadores internos.
No realices diagnósticos ni inferencias clínicas.

Respuesta del jugador:
${JSON.stringify(userInput.rawText)}

Opción narrativa resuelta:
${JSON.stringify(userInput.resolvedChoice)}

Contexto narrativo:
${JSON.stringify(narrativeState)}

Opciones disponibles:
${JSON.stringify(currentChoices)}

Indicadores:

- lowMood: tristeza, abatimiento, visión negativa o desesperanza.
- anhedonia: pérdida o reducción del interés o disfrute.
- lowEnergy: cansancio, fatiga o dificultad para iniciar o mantener actividades.
- lowSelfWorth: culpa excesiva, autocrítica o valoración negativa de uno mismo.
- socialWithdrawal: tendencia a evitar o reducir interacción social.
- worry: preocupación excesiva o anticipación repetida de resultados negativos.
- tension: nerviosismo, inquietud, irritabilidad o dificultad para relajarse.
- avoidance: evitar una situación específicamente por miedo, preocupación o malestar anticipado.
- somaticAnxiety: manifestaciones físicas como palpitaciones, temblor, sudoración, ahogo o mareo.
- sleepDisturbance: dificultades relevantes en cantidad, calidad o regularidad del sueño.
- concentrationDifficulty: dificultades para concentrarse, mantener la atención o tomar decisiones.

Reglas:
- Evalúa exclusivamente la información aportada por el jugador en este turno.
- No uses como evidencia hechos inventados previamente por la narración.
- Una elección aislada no debe interpretarse automáticamente como un indicador.
- Solo registra evidencia cuando exista una relación suficientemente clara con la definición del indicador.
- Evita inferencias fuertes a partir de respuestas breves o ambiguas.
- No registres el mismo significado en varios indicadores salvo que existan evidencias diferenciables.
- Devuelve como máximo 3 evidencias.
- scoreDelta debe ser:
  1 para evidencia relevante pero limitada.
  2 para evidencia clara y explícita.
- Si no existe evidencia suficiente, devuelve evidence como array vacío.
  `.trim();
}

module.exports = {
  buildIndicatorPrompt,
};
