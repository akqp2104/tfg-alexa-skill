const MAX_ERROR_MESSAGE_LENGTH = 300;

function sanitizeError(error) {
  return {
    name: error?.name,
    code: error?.code,
    status: error?.status,
    message:
      typeof error?.message === "string"
        ? error.message.slice(0, MAX_ERROR_MESSAGE_LENGTH)
        : undefined,
  };
}

module.exports = {
  sanitizeError,
};
