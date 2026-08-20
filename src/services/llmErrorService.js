function isRetryable(error) {
  if (
    error.code === "LLM_SCHEMA_INVALID" ||
    error.code === "LLM_SEMANTIC_INVALID" ||
    error.code === "LLM_INVALID_JSON"
  ) {
    return true;
  }

  if (
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  ) {
    return true;
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLlmError(error) {
  return typeof error?.code === "string" && error.code.startsWith("LLM_");
}

module.exports = {
  isRetryable,
  isLlmError,
  sleep,
};
