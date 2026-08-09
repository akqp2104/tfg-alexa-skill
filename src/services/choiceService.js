function normalizeChoice(choice) {
  if (!choice) {
    return null;
  }

  return choice
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getResolvedChoice(handlerInput, slotName) {
  const slot = handlerInput.requestEnvelope.request.intent.slots?.[slotName];

  if (!slot) {
    return null;
  }

  const resolutions = slot.resolutions?.resolutionsPerAuthority;

  if (resolutions) {
    for (const resolution of resolutions) {
      if (
        resolution.status?.code === "ER_SUCCESS_MATCH" &&
        resolution.values?.length > 0
      ) {
        const canonicalValue = resolution.values[0].value.name;

        return normalizeChoice(canonicalValue);
      }
    }
  }

  // Fallback: si Alexa no resuelve la entidad,
  // usamos el valor reconocido directamente.
  return normalizeChoice(slot.value);
}

module.exports = {
  normalizeChoice,
  getResolvedChoice,
};
