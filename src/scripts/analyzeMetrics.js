const fs = require("node:fs");

function parseMetrics(input) {
  return input
    .split(/\r?\n/)
    .map(parseMetricLine)
    .filter(Boolean);
}

function parseMetricLine(line) {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = tryParseJson(trimmed);

  if (parsed?.event) {
    return parsed;
  }

  if (typeof parsed?.message === "string") {
    const message = tryParseJson(parsed.message.trim());
    return message?.event ? message : null;
  }

  return null;
}

function buildMetricsReport(events) {
  const turns = events.filter(({ event }) => event === "TURN_COMPLETED");
  const retryTurns = turns.filter(({ retryCount }) => retryCount > 0);
  const fallbackTurns = turns.filter(({ fallbackUsed }) => fallbackUsed);
  const summaryTurns = turns.filter(({ summaryAttempted }) => summaryAttempted);
  const llmSuccesses = events.filter(
    ({ event }) => event === "LLM_CALL_SUCCESS",
  );
  const llmFailures = events.filter(
    ({ event }) => event === "LLM_CALL_FAILED",
  );
  const retryEvents = events.filter(({ event }) => event === "LLM_RETRY");
  const completedRetries = events.filter(
    ({ event }) => event === "LLM_RETRY_COMPLETED",
  );
  const fallbackEvents = events.filter(
    ({ event }) => event === "NARRATIVE_FALLBACK",
  );
  const summaries = events.filter(
    ({ event }) => event === "NARRATIVE_SUMMARY",
  );

  return {
    sample: {
      completedTurns: turns.length,
      successfulLlmCalls: llmSuccesses.length,
      failedLlmCalls: llmFailures.length,
    },
    rates: {
      retryTurnPercentage: percentage(retryTurns.length, turns.length),
      fallbackTurnPercentage: percentage(fallbackTurns.length, turns.length),
      summaryTurnPercentage: percentage(summaryTurns.length, turns.length),
      overEightSecondsPercentage: percentage(
        turns.filter(({ exceedsEightSeconds }) => exceedsEightSeconds).length,
        turns.length,
      ),
    },
    turnLatencyMs: {
      all: calculateStats(values(turns, "totalDurationMs")),
      withRetry: calculateStats(values(retryTurns, "totalDurationMs")),
      withoutRetry: calculateStats(
        values(
          turns.filter(({ retryCount }) => !retryCount),
          "totalDurationMs",
        ),
      ),
      withSummary: calculateStats(values(summaryTurns, "totalDurationMs")),
      withoutSummary: calculateStats(
        values(
          turns.filter(({ summaryAttempted }) => !summaryAttempted),
          "totalDurationMs",
        ),
      ),
    },
    stageLatencyMs: {
      safety: calculateStats(values(turns, "safetyDurationMs")),
      indicatorAnalysis: calculateStats(
        values(turns, "indicatorDurationMs"),
      ),
      narrativeGeneration: calculateStats(
        values(turns, "narrativeDurationMs"),
      ),
      narrativeSummary: calculateStats(
        values(summaryTurns, "summaryDurationMs"),
      ),
    },
    retries: {
      started: retryEvents.length,
      completed: completedRetries.length,
      succeeded: completedRetries.filter(({ succeeded }) => succeeded).length,
      durationMs: calculateStats(
        values(completedRetries, "retryDurationMs"),
      ),
    },
    fallbacks: {
      events: fallbackEvents.length,
      recoveredTurns: fallbackTurns.length,
      initialFallbacks: fallbackEvents.filter(
        ({ phase }) => phase === "initial",
      ).length,
    },
    summaries: {
      attempted: summaries.length,
      succeeded: summaries.filter(({ outcome }) => outcome === "success")
        .length,
      skipped: summaries.filter(({ outcome }) => outcome === "skipped").length,
      durationMs: calculateStats(values(summaries, "durationMs")),
    },
    llmLatencyMs: {
      all: calculateStats(
        values([...llmSuccesses, ...llmFailures], "latencyMs"),
      ),
      successful: calculateStats(values(llmSuccesses, "latencyMs")),
      failed: calculateStats(values(llmFailures, "latencyMs")),
    },
    llmTokens: {
      successful: calculateStats(values(llmSuccesses, "totalTokenCount")),
      failed: calculateStats(values(llmFailures, "totalTokenCount")),
    },
  };
}

function calculateStats(samples) {
  const sorted = samples.filter(Number.isFinite).sort((a, b) => a - b);

  if (sorted.length === 0) {
    return { count: 0, average: null, maximum: null, p50: null, p95: null };
  }

  return {
    count: sorted.length,
    average: round(
      sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    ),
    maximum: sorted.at(-1),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
  };
}

function percentile(sorted, proportion) {
  const index = Math.ceil(sorted.length * proportion) - 1;
  return sorted[Math.max(0, index)];
}

function values(events, field) {
  return events.map((event) => event[field]).filter(Number.isFinite);
}

function percentage(part, total) {
  return total === 0 ? 0 : round((part / total) * 100);
}

function round(value) {
  return Number(value.toFixed(2));
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatMarkdownReport(report) {
  const latencyRows = [
    ["Turno", report.turnLatencyMs.all],
    ["Turno con retry", report.turnLatencyMs.withRetry],
    ["Turno sin retry", report.turnLatencyMs.withoutRetry],
    ["Turno con resumen", report.turnLatencyMs.withSummary],
    ["Turno sin resumen", report.turnLatencyMs.withoutSummary],
    ["Safety", report.stageLatencyMs.safety],
    ["Indicadores", report.stageLatencyMs.indicatorAnalysis],
    ["Narrativa", report.stageLatencyMs.narrativeGeneration],
    ["Resumen", report.stageLatencyMs.narrativeSummary],
  ];
  const lines = [
    "| Métrica | N | Media ms | Máximo ms | P50 ms | P95 ms |",
    "|---|---:|---:|---:|---:|---:|",
    ...latencyRows.map(([label, stats]) =>
      [
        `| ${label}`,
        stats.count,
        display(stats.average),
        display(stats.maximum),
        display(stats.p50),
        `${display(stats.p95)} |`,
      ].join(" | "),
    ),
    "",
    "| Tasa | Porcentaje |",
    "|---|---:|",
    `| Turnos con retry | ${report.rates.retryTurnPercentage}% |`,
    `| Turnos con fallback | ${report.rates.fallbackTurnPercentage}% |`,
    `| Turnos con resumen | ${report.rates.summaryTurnPercentage}% |`,
    `| Turnos de más de 8 s | ${report.rates.overEightSecondsPercentage}% |`,
  ];

  return `${lines.join("\n")}\n`;
}

function display(value) {
  return value ?? "—";
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const useMarkdown = args.includes("--markdown");
  const source = args.find((argument) => argument !== "--markdown") || 0;
  const input = fs.readFileSync(source, "utf8");
  const report = buildMetricsReport(parseMetrics(input));
  process.stdout.write(
    useMarkdown
      ? formatMarkdownReport(report)
      : `${JSON.stringify(report, null, 2)}\n`,
  );
}

module.exports = {
  parseMetrics,
  buildMetricsReport,
  calculateStats,
  formatMarkdownReport,
};
