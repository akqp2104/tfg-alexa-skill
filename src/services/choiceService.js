const DYNAMIC_ENTITY_TYPE = "CHOICE_TYPE";

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

        values: choices.map((choice) => ({
          id: choice.id,

          name: {
            value: choice.text,
            synonyms: choice.synonyms || [],
          },
        })),
      },
    ],
  };
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
  addDynamicEntities,
};
