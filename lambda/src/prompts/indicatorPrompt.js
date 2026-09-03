function buildIndicatorPrompt({ userInput, narrativeState, currentChoices }) {
  return `
Detecta evidencia útil en la elección del jugador para actualizar indicadores internos.
No diagnostiques ni uses como evidencia hechos inventados por la narración.

RESPUESTA: ${JSON.stringify(userInput.rawText)}
OPCIÓN RESUELTA: ${JSON.stringify(userInput.resolvedChoice)}
CONTEXTO MÍNIMO: ${JSON.stringify(narrativeState)}
ALTERNATIVAS: ${JSON.stringify(currentChoices)}

INDICADORES:
- lowMood: tristeza, abatimiento, negatividad o desesperanza.
- anhedonia: pérdida de interés o disfrute.
- lowEnergy: cansancio, fatiga o dificultad para mantener actividades.
- lowSelfWorth: culpa, autocrítica o valoración negativa propia.
- socialWithdrawal: reducción o evitación de interacción social.
- worry: preocupación excesiva o anticipación negativa repetida.
- tension: nerviosismo, inquietud, irritabilidad o dificultad para relajarse.
- avoidance: evitación por miedo, preocupación o malestar anticipado.
- somaticAnxiety: palpitaciones, temblor, sudoración, ahogo o mareo.
- sleepDisturbance: problemas relevantes de cantidad, calidad o regularidad del sueño.
- concentrationDifficulty: dificultad para concentrarse, atender o decidir.

REGLAS:
- Analiza únicamente la información necesaria para clasificar la respuesta.
- No extraigas ni devuelvas nombres, direcciones, teléfonos, correos electrónicos u otros identificadores personales.
- No conserves información personal que no sea necesaria para determinar los indicadores.
- Interpreta la respuesta y la opción dentro del contexto y frente a las alternativas.
- Una elección aislada puede aportar evidencia contextual, pero descarta elecciones neutrales,
  ambiguas, estratégicas o impuestas por la situación.
- Exige una relación clara con la definición y evita inferencias fuertes.
- No dupliques un mismo significado entre indicadores. Devuelve como máximo 3 evidencias.
- scoreDelta 1: evidencia contextual o limitada. scoreDelta 2: declaración directa y explícita.
- Si no hay evidencia suficiente, devuelve evidence vacío.
  `.trim();
}

module.exports = { buildIndicatorPrompt };
