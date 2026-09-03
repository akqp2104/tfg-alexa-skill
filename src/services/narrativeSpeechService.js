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
  const labels = ["opción uno", "opción dos", "opción tres"];
  const texts = choices
    .map((choice, index) => {
      const text = choice?.text?.trim();
      return text ? `${labels[index] || `opción ${index + 1}`}: ${text}` : null;
    })
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
