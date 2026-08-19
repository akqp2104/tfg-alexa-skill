const SELF = "SELF";
const OTHERS = "OTHERS";

function handleUncertain(gameState) {
  gameState.safetyState = {
    state: "UNCERTAIN",
    phase: "OPEN_SAFETY_CHECK",
  };

  return continueConversation(
    gameState,
    "Voy a pausar la historia un momento porque me importa que estés a salvo. " +
      getServiceLimitationText() +
      " ¿Lo que has contado está ocurriendo fuera de la historia? Puedes explicarlo con tus propias palabras.",
    "¿Está ocurriendo fuera de la historia o solamente le ocurre al personaje?",
  );
}

function handleSafetyTriggered(gameState, riskTarget = "UNKNOWN") {
  return beginDirectRiskCheck(gameState, riskTarget, "Gracias por contarlo. ");
}

function confirmUncertainIsReal(gameState, riskTarget = "UNKNOWN") {
  return beginDirectRiskCheck(
    gameState,
    riskTarget,
    "Gracias por aclararlo. Voy a escuchar sin juzgarte. ",
  );
}

function beginDirectRiskCheck(gameState, riskTarget, prefix = "") {
  const normalizedTarget = normalizeRiskTarget(riskTarget);
  const questionTarget = normalizedTarget === OTHERS ? OTHERS : SELF;
  const pendingRiskTarget =
    normalizedTarget === "BOTH" || normalizedTarget === "UNKNOWN"
      ? OTHERS
      : null;

  gameState.safetyState = {
    state: "SAFETY_TRIGGERED",
    phase: "DIRECT_RISK_CHECK",
    riskTarget: normalizedTarget,
    questionTarget,
    pendingRiskTarget,
  };

  return continueConversation(
    gameState,
    prefix + getServiceLimitationText() + " " + getDirectRiskQuestion(questionTarget),
    getDirectRiskQuestion(questionTarget),
  );
}

function handleDirectRiskConfirmed(gameState) {
  const riskTarget = gameState.safetyState.questionTarget || "UNKNOWN";

  gameState.safetyState = {
    state: "SAFETY_TRIGGERED",
    phase: "CHECK_IMMEDIATE_DANGER",
    riskTarget,
  };

  return continueConversation(
    gameState,
    "Gracias por decírmelo. ¿Has hecho un plan para hacerlo pronto o tienes acceso ahora mismo a algo que podrías utilizar?",
    "¿Tienes un plan para hacerlo pronto o acceso a algo que podrías utilizar ahora?",
  );
}

function handleDirectRiskDenied(gameState) {
  const pendingRiskTarget = gameState.safetyState.pendingRiskTarget;

  if (pendingRiskTarget) {
    gameState.safetyState = {
      ...gameState.safetyState,
      questionTarget: pendingRiskTarget,
      pendingRiskTarget: null,
    };

    return continueConversation(
      gameState,
      "Gracias por responder. También necesito preguntarte esto claramente. " +
        getDirectRiskQuestion(pendingRiskTarget),
      getDirectRiskQuestion(pendingRiskTarget),
    );
  }

  return handleNoImmediateDanger(gameState);
}

function repeatDirectRiskQuestion(gameState) {
  const questionTarget = gameState.safetyState.questionTarget || SELF;

  return continueConversation(
    gameState,
    "Entiendo que puede ser difícil responder. Necesito preguntarlo claramente para orientarte hacia ayuda humana. " +
      getDirectRiskQuestion(questionTarget),
    getDirectRiskQuestion(questionTarget),
  );
}

function dismissUncertain(gameState) {
  gameState.safetyState = { state: "NORMAL", phase: null };

  return {
    gameState,
    response: "Gracias por aclararlo. Volvamos a la historia.",
    reprompt: "¿Qué decides hacer?",
    shouldEndSession: false,
    resumeNarrative: true,
  };
}

function handleImmediateDanger(gameState) {
  const riskTarget = gameState.safetyState.riskTarget || "UNKNOWN";
  finalize(gameState, riskTarget);

  return {
    gameState,
    response:
      "Busca ayuda humana inmediata. " +
      getImmediateSafetyAction(riskTarget) +
      " " +
      getEmergencyResourcesText(riskTarget) +
      " Voy a detener la historia ahora.",
    reprompt: null,
    shouldEndSession: true,
  };
}

function handleNoImmediateDanger(gameState) {
  const riskTarget =
    gameState.safetyState.questionTarget ||
    gameState.safetyState.riskTarget ||
    "UNKNOWN";
  finalize(gameState, riskTarget);

  return {
    gameState,
    response:
      "Gracias por responder. Aunque no haya peligro inmediato, es importante hablar con una persona de confianza o un profesional. " +
      getNonImmediateSafetyAction(riskTarget) +
      " " +
      getEmergencyResourcesText(riskTarget) +
      " Voy a detener la historia por ahora.",
    reprompt: null,
    shouldEndSession: true,
  };
}

function repeatImmediateDangerQuestion(gameState) {
  return continueConversation(
    gameState,
    "Entiendo que puede ser difícil responder. ¿Has hecho un plan para hacerlo pronto o tienes acceso ahora mismo a algo que podrías utilizar?",
    "¿Tienes un plan para hacerlo pronto o acceso a algo que podrías utilizar ahora?",
  );
}

function getDirectRiskQuestion(target) {
  if (target === OTHERS) {
    return "¿Estás pensando ahora mismo en hacer daño a otra persona?";
  }

  return "¿Estás pensando ahora mismo en hacerte daño o en suicidarte?";
}

function getServiceLimitationText() {
  return "Soy Alexa; no soy una profesional sanitaria ni un servicio de emergencias.";
}

function getImmediateSafetyAction(target) {
  if (target === OTHERS) {
    return "Aléjate de la persona y de cualquier objeto que pueda utilizarse para causar daño, siempre que puedas hacerlo sin ponerte en peligro.";
  }

  return "Procura no quedarte a solas y aléjate de cualquier cosa con la que pudieras hacerte daño, si puedes hacerlo de forma segura.";
}

function getNonImmediateSafetyAction(target) {
  if (target === OTHERS) {
    return "Mantén distancia de la persona y de cualquier objeto que pueda utilizarse para causar daño, si puedes hacerlo de forma segura.";
  }

  return "Procura no quedarte a solas mientras contactas con esa ayuda.";
}

function getEmergencyResourcesText(target) {
  if (target === OTHERS) {
    return "Si estás en España y alguien puede estar en peligro, llama al 112. Si estás en otro país, llama al número de emergencias de tu zona.";
  }

  return (
    "Si estás en España y existe peligro inmediato, llama al 112. " +
    "Para pensamientos o riesgo de suicidio, también puedes llamar a la Línea 024, que es gratuita, confidencial y está disponible las 24 horas. " +
    "Si estás en otro país, llama al número de emergencias o a la línea de crisis de tu zona."
  );
}

function normalizeRiskTarget(target) {
  return ["SELF", "OTHERS", "BOTH", "UNKNOWN"].includes(target)
    ? target
    : "UNKNOWN";
}

function continueConversation(gameState, response, reprompt) {
  return { gameState, response, reprompt, shouldEndSession: false };
}

function finalize(gameState, riskTarget) {
  gameState.safetyState = {
    state: "SAFETY_TRIGGERED",
    phase: "FINALIZED",
    riskTarget,
  };
}

module.exports = {
  handleUncertain,
  handleSafetyTriggered,
  confirmUncertainIsReal,
  handleDirectRiskConfirmed,
  handleDirectRiskDenied,
  repeatDirectRiskQuestion,
  dismissUncertain,
  handleImmediateDanger,
  handleNoImmediateDanger,
  repeatImmediateDangerQuestion,
};
