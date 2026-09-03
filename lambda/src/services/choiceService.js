const DYNAMIC_ENTITY_TYPE = "CHOICE_TYPE";
const NUMERIC_ALIASES = [
  ["uno", "opción uno", "la primera", "primera opción"],
  ["dos", "opción dos", "la segunda", "segunda opción"],
  ["tres", "opción tres", "la tercera", "tercera opción"],
];
const CONFLICTING_SINGLE_WORDS = new Set([
  "llamar",
  "salir",
  "parar",
  "cancelar",
]);

function getUserInput(handlerInput) {
  const slot = handlerInput.requestEnvelope.request.intent.slots?.choice;

  if (!slot) {
    return null;
  }

  return {
    rawText: slot.value?.trim() || null,
    resolvedChoice: getResolvedChoice(slot),
  };
}

function getResolvedChoice(slot) {
  const authorities = slot.resolutions?.resolutionsPerAuthority;

  if (!authorities) {
    return null;
  }

  for (const authority of authorities) {
    if (
      authority.status?.code === "ER_SUCCESS_MATCH" &&
      authority.values?.length > 0
    ) {
      const value = authority.values[0].value;

      return {
        id: value.id || null,
        name: value.name || null,
      };
    }
  }

  return null;
}

function buildDynamicEntitiesDirective(choices) {
  return {
    type: "Dialog.UpdateDynamicEntities",
    updateBehavior: "REPLACE",
    types: [
      {
        name: DYNAMIC_ENTITY_TYPE,

        values: choices.map((choice, index) => ({
          id: choice.id,

          name: {
            value: choice.text,
            synonyms: buildChoiceSynonyms(choice, index),
          },
        })),
      },
    ],
  };
}

function buildChoiceSynonyms(choice, index) {
  const synonyms = [
    ...(choice.synonyms || []),
    ...(NUMERIC_ALIASES[index] || []),
  ];

  return [...new Set(synonyms.map((value) => value?.trim()).filter(Boolean))]
    .filter((value) => !CONFLICTING_SINGLE_WORDS.has(value.toLowerCase()))
    .filter((value) => value.toLowerCase() !== choice.text.trim().toLowerCase());
}

function addDynamicEntities(responseBuilder, choices) {
  if (!choices || choices.length === 0) {
    return responseBuilder;
  }

  return responseBuilder.addDirective(buildDynamicEntitiesDirective(choices));
}

module.exports = {
  getUserInput,
  getResolvedChoice,
  buildDynamicEntitiesDirective,
  buildChoiceSynonyms,
  addDynamicEntities,
};
