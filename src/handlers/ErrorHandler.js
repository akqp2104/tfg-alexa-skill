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
      return handlerInput.responseBuilder
        .speak(
          "Lo siento, el servicio de generación de la historia no está disponible en este momento.",
        )
        .withShouldEndSession(true)
        .getResponse();
    }

    if (error.code === "LLM_QUOTA_EXCEEDED") {
      return handlerInput.responseBuilder
        .speak(
          "Lo siento, ahora mismo no puedo continuar generando la historia. " +
            "Puedes intentarlo de nuevo más tarde.",
        )
        .withShouldEndSession(true)
        .getResponse();
    }

    if (error.code === "LLM_INVALID_JSON") {
      return handlerInput.responseBuilder
        .speak(
          "Ha ocurrido un problema al generar la historia. " +
            "Puedes intentarlo de nuevo.",
        )
        .withShouldEndSession(true)
        .getResponse();
    }

    if (
      error.code === "LLM_SCHEMA_INVALID" ||
      error.code === "LLM_SEMANTICS_INVALID"
    ) {
      return handlerInput.responseBuilder
        .speak(
          "Ha ocurrido un problema al generar la historia. " +
            "Puedes intentarlo de nuevo.",
        )
        .withShouldEndSession(true)
        .getResponse();
    }

    if (error.code === "INVALID_SAFETY_FLOW_STATE") {
      return handlerInput.responseBuilder
        .speak(
          "Ha ocurrido un problema al procesar la respuesta de seguridad. " +
            "Puedes intentarlo de nuevo.",
        )
        .withShouldEndSession(true)
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak("Lo siento, se ha producido un error. Inténtalo de nuevo.")
      .reprompt("Puedes intentarlo de nuevo.")
      .getResponse();
  },
};

module.exports = ErrorHandler;
