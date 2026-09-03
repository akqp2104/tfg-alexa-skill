const ErrorHandler = {
  canHandle() {
    return true;
  },

  handle(handlerInput, error) {
    console.error("UNHANDLED ERROR METADATA:", {
      name: error?.name || "Error",
      code: error?.code || "UNKNOWN",
      status: error?.status || null,
    });

    if (error.code === "LLM_MODEL_UNAVAILABLE") {
      return endSession(
        handlerInput,
        "Lo siento, el servicio de generación de la historia no está disponible en este momento.",
      );
    }

    if (error.code === "LLM_QUOTA_EXCEEDED") {
      return endSession(
        handlerInput,
        "Lo siento, ahora mismo no puedo continuar generando la historia. " +
          "Puedes intentarlo de nuevo más tarde.",
      );
    }

    if (error.code === "LLM_INVALID_JSON") {
      return endSession(
        handlerInput,
        "Ha ocurrido un problema al generar la historia. " +
          "Puedes intentarlo de nuevo.",
      );
    }

    if (
      error.code === "LLM_SCHEMA_INVALID" ||
      error.code === "LLM_SEMANTIC_INVALID"
    ) {
      return endSession(
        handlerInput,
        "Ha ocurrido un problema al generar la historia. " +
          "Puedes intentarlo de nuevo.",
      );
    }

    if (error.code === "INVALID_SAFETY_FLOW_STATE") {
      return endSession(
        handlerInput,
        "Ha ocurrido un problema al procesar la respuesta de seguridad. " +
          "Puedes intentarlo de nuevo.",
      );
    }

    return handlerInput.responseBuilder
      .speak("Lo siento, se ha producido un error. Inténtalo de nuevo.")
      .reprompt("Puedes intentarlo de nuevo.")
      .getResponse();
  },
};

function endSession(handlerInput, message) {
  return handlerInput.responseBuilder
    .speak(message)
    .withShouldEndSession(true)
    .getResponse();
}

module.exports = ErrorHandler;
