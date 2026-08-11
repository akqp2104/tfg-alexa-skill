function buildInitialScenePrompt(gameState, storySeed) {
  const prompt = `
Genera la escena inicial de una historia interactiva contemporánea y realista para Alexa.

PUNTO DE PARTIDA:
${JSON.stringify(storySeed)}

Los parámetros del punto de partida tienen las siguientes funciones:
- setting: entorno general en el que comienza la escena.
- socialContext: situación social inicial del protagonista.
- activity: actividad que está realizando al comenzar.
- trigger: acontecimiento que altera la situación inicial.
- stakes: aquello que hace relevante la situación o decisión.
- openingStyle: forma narrativa en la que debe comenzar la escena.

INSTRUCCIONES NARRATIVAS:
- Integra de forma natural todos los parámetros del punto de partida.
- Los parámetros son condiciones generales, no frases que debas reproducir literalmente.
- Concreta libremente lugares, personajes, actividades y acontecimientos sin contradecir 
  los parámetros.
- Si una combinación resulta poco habitual, busca una interpretación cotidiana y realista 
  que permita integrarla.
- Introduce un objetivo, problema o pequeño conflicto que permita continuar desarrollando 
  la historia.
- La situación debe ser cotidiana y verosímil. Evita conflictos excesivamente dramáticos 
  o extraordinarios.
- No resuelvas el conflicto en esta primera escena.

APERTURA:
- Respeta openingStyle para decidir cómo construir las primeras frases.
- openingStyle solo determina cómo comienza la narración; no modifica el contenido, los 
  acontecimientos ni el tono general de la historia.
- Entra directamente en la situación. Evita introducciones genéricas o innecesarias.
- No comiences indicando la hora concreta ni utilices fórmulas como "son las ocho de la 
  mañana/tarde", salvo que conocer la hora sea imprescindible para comprender la situación.
- No menciones explícitamente el nombre del openingStyle.

INTERACCIÓN:
- Escribe en español de España y en segunda persona.
- La escena debe ser breve, clara y natural al ser escuchada mediante voz.
- Termina en un punto en el que el usuario deba decidir qué hacer.
- Ofrece siempre 2 o 3 alternativas diferentes y razonables.
- Las alternativas deben representar formas distintas de actuar y no simples reformulaciones 
  de la misma decisión.
- No enumeres ni menciones las opciones dentro de la narración.
- Genera las alternativas únicamente en choices.

RESTRICCIONES:
- No menciones salud mental, ansiedad, depresión, indicadores, cuestionarios ni evaluaciones.
- No diagnostiques al usuario.
- No atribuyas al usuario real emociones, pensamientos, experiencias, síntomas ni 
  características que no haya expresado.
- No conviertas sistemáticamente la escena en un examen, una entrega académica, una reunión, 
  llegar tarde o recibir un mensaje. Busca variedad en las situaciones concretas.`.trim();

  return prompt;
}

function buildNextScenePrompt(gameState, userInput) {
  const prompt = `
    Continúa una historia interactiva contemporánea y realista para Alexa.

ESTADO NARRATIVO:
${JSON.stringify(gameState.narrativeState)}

DECISIÓN DEL JUGADOR:
${JSON.stringify(userInput)}

El estado narrativo describe la situación actual de la historia y los acontecimientos relevantes que deben respetarse.
La decisión del jugador representa la acción que acaba de elegir y debe influir directamente en la continuación.

INSTRUCCIONES NARRATIVAS:
- Continúa la historia de forma coherente a partir del estado narrativo actual.
- Integra de forma natural la decisión que acaba de tomar el jugador.
- La decisión debe producir una consecuencia perceptible en la historia, aunque esta no tiene que ser necesariamente inmediata o determinante.
- Respeta los acontecimientos anteriores, el estado de los personajes, sus relaciones, los compromisos adquiridos y los conflictos existentes.
- No contradigas ni ignores información relevante contenida en el estado narrativo.
- Haz avanzar la situación; evita limitarte a reformular o describir la decisión que acaba de tomar el jugador.
- Mantén la situación cotidiana y verosímil. Evita introducir acontecimientos excesivamente dramáticos o extraordinarios sin justificación narrativa.

CONTINUIDAD:
- Utiliza los openConflicts y commitments pendientes cuando resulte natural para continuar o desarrollar la historia.
- Prioriza desarrollar conflictos, objetivos o compromisos existentes antes de introducir otros nuevos.
- Puedes introducir un nuevo objetivo, obstáculo o pequeño conflicto cuando sea necesario para que la historia avance.
- No introduzcas conflictos continuamente si la situación actual todavía ofrece posibilidades de desarrollo.
- Permite que las decisiones del jugador puedan resolver, modificar, complicar o aplazar los conflictos existentes.
- Ten en cuenta storyProgress para que la evolución de la escena sea adecuada a la fase actual de la historia.

INTERACCIÓN:
- Escribe en español de España y en segunda persona.
- La escena debe ser breve, clara y natural al ser escuchada mediante voz.
- Termina en un punto en el que el usuario deba decidir qué hacer.
- Ofrece siempre 2 o 3 alternativas diferentes y razonables.
- Las alternativas deben representar formas distintas de actuar y no simples reformulaciones de la misma decisión.
- Las opciones deben ser coherentes con la situación y permitir que la historia pueda continuar en direcciones diferentes.
- No enumeres ni menciones las opciones dentro de la narración.
- Genera las alternativas únicamente en choices.

RESTRICCIONES:
- No menciones salud mental, ansiedad, depresión, indicadores, cuestionarios ni evaluaciones.
- No diagnostiques al usuario.
- No atribuyas al usuario real emociones, pensamientos, experiencias, síntomas ni características que no haya expresado.
- No confundas el estado del protagonista ficticio con información sobre el usuario real.`.trim();

  return prompt;
}

module.exports = {
  buildInitialScenePrompt,
  buildNextScenePrompt,
};
