function logMetric(event, metadata = {}) {
  console.log(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...metadata,
    }),
  );
}

module.exports = logMetric;
