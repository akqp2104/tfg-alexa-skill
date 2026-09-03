function validateNarrativeSemantics(narrative) {
  const { storyProgress } = narrative.narrativeStateUpdate;
  const { storyComplete } = narrative;

  if (storyComplete && storyProgress !== "resolution") {
    return {
      valid: false,
      reason: "STORY_COMPLETE_OUTSIDE_RESOLUTION",
    };
  }

  const choiceIds = narrative.choices.map((choice) => choice.id);

  if (new Set(choiceIds).size !== choiceIds.length) {
    return {
      valid: false,
      reason: "DUPLICATED_CHOICE_IDS",
    };
  }

  const choiceTexts = narrative.choices.map((choice) =>
    choice.text.trim().toLowerCase(),
  );

  if (new Set(choiceTexts).size !== choiceTexts.length) {
    return {
      valid: false,
      reason: "DUPLICATED_CHOICES",
    };
  }

  return {
    valid: true,
  };
}

module.exports = {
  validateNarrativeSemantics,
};
