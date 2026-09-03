const storyProgressInstructions = {
  introduction:
    "Presenta y desarrolla el contexto, los personajes, el objetivo principal y los primeros conflictos.",

  development:
    "Desarrolla las consecuencias de las decisiones anteriores, profundiza en los conflictos existentes y permite que surjan nuevas complicaciones coherentes.",

  climax:
    "Conduce los conflictos principales hacia un momento de mayor relevancia o decisión. Evita introducir conflictos importantes completamente nuevos.",

  resolution:
    "Conduce la historia hacia el cierre. Resuelve los conflictos principales y compromisos pendientes, recupera consecuencias de decisiones anteriores y evita abrir nuevas tramas.",
};

function getStoryProgressInstruction(progress) {
  return (
    storyProgressInstructions[progress] || storyProgressInstructions.development
  );
}

module.exports = {
  getStoryProgressInstruction,
};
