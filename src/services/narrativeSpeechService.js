function buildResponse(narrative, choices) {
  const options = buildOptionsText(choices);

  if (!options) {
    return narrative;
  }

  return `${narrative.trim()} Tus opciones son: ${options}. ¿Qué prefieres?`;
}

function buildReprompt(choices, fallback = "¿Qué decides hacer?") {
  const options = buildOptionsText(choices);

  if (!options) {
    return fallback;
  }

  return `Puedes elegir entre ${options}. ¿Qué prefieres?`;
}

function buildOptionsText(choices = []) {
  const texts = choices
    .map((choice) => choice?.text?.trim())
    .filter(Boolean);

  if (texts.length === 0) {
    return "";
  }

  if (texts.length === 1) {
    return texts[0];
  }

  return `${texts.slice(0, -1).join(", ")} o ${texts.at(-1)}`;
}

module.exports = {
  buildResponse,
  buildReprompt,
};
