/**
 * Escribe un evento técnico estructurado sin incorporar datos de la partida.
 *
 * @param {string} event Nombre estable del evento.
 * @param {Record<string, unknown>} [metadata] Valores numéricos o categóricos.
 * @returns {void}
 */
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
