const indicatorDescriptions = require("../config/indicatorDescriptions");

function buildFinalResponse(evaluation) {
  const relevant = evaluation.relevantIndicators.slice(0, 3);

  if (relevant.length === 0) {
    const hasUnexploredIndicators = Object.values(
      evaluation.indicatorResults,
    ).some((result) => result.status === "not_explored");

    return (
      "La historia ha terminado. " +
      "Durante esta partida no se han recogido " +
      "suficientes evidencias repetidas para destacar " +
      "ninguna de las dimensiones analizadas. " +
      (hasUnexploredIndicators
        ? "Algunas dimensiones no se exploraron lo suficiente y no pueden interpretarse. "
        : "") +
      "Este resultado se basa únicamente en las decisiones " +
      "realizadas durante la experiencia y no constituye " +
      "una evaluación clínica."
    );
  }

  const descriptions = relevant.map(
    (item) => indicatorDescriptions[item.indicator],
  );

  return (
    "La historia ha terminado. " +
    "A lo largo de la partida aparecieron especialmente " +
    formatList(descriptions) +
    ". Este resultado se basa únicamente en las respuestas " +
    "dadas dentro de la experiencia y no constituye un diagnóstico " +
    "ni una evaluación clínica."
  );
}

function formatList(items) {
  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} y ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} y ` + items[items.length - 1];
}

module.exports = {
  buildFinalResponse,
};
