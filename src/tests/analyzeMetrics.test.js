const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseMetrics,
  buildMetricsReport,
  calculateStats,
  formatMarkdownReport,
} = require("../scripts/analyzeMetrics");

test("metric statistics include averages maximums and percentiles", () => {
  assert.deepEqual(calculateStats([100, 200, 300, 400]), {
    count: 4,
    average: 250,
    maximum: 400,
    p50: 200,
    p95: 400,
  });
});

test("the report compares retry fallback and summary turns", () => {
  const events = [
    turn({ totalDurationMs: 1000, narrativeDurationMs: 600 }),
    turn({
      totalDurationMs: 2000,
      narrativeDurationMs: 1500,
      retryCount: 1,
      retryDurationMs: 700,
    }),
    turn({
      totalDurationMs: 3000,
      narrativeDurationMs: 800,
      summaryAttempted: true,
      summaryDurationMs: 1200,
      fallbackUsed: true,
      outcome: "fallback",
    }),
    {
      event: "LLM_RETRY",
      task: "narrative_generation",
      attempt: 2,
    },
    {
      event: "LLM_RETRY_COMPLETED",
      succeeded: true,
      retryDurationMs: 700,
    },
    { event: "NARRATIVE_FALLBACK", turn: 3 },
    { event: "NARRATIVE_SUMMARY", outcome: "success", durationMs: 1200 },
    { event: "LLM_CALL_SUCCESS", latencyMs: 500 },
    { event: "LLM_CALL_FAILED", latencyMs: 400 },
  ];

  const report = buildMetricsReport(events);

  assert.equal(report.sample.completedTurns, 3);
  assert.equal(report.rates.retryTurnPercentage, 33.33);
  assert.equal(report.rates.fallbackTurnPercentage, 33.33);
  assert.equal(report.rates.summaryTurnPercentage, 33.33);
  assert.equal(report.turnLatencyMs.withRetry.average, 2000);
  assert.equal(report.turnLatencyMs.withoutRetry.average, 2000);
  assert.equal(report.stageLatencyMs.narrativeSummary.average, 1200);
  assert.equal(report.retries.succeeded, 1);
  assert.equal(report.fallbacks.recoveredTurns, 1);
  assert.equal(report.summaries.succeeded, 1);
  assert.equal(report.summaries.durationMs.average, 1200);
  assert.equal(report.llmLatencyMs.successful.average, 500);
  assert.equal(report.llmLatencyMs.failed.average, 400);
  assert.match(formatMarkdownReport(report), /Turno con retry.*2000/);
  assert.match(formatMarkdownReport(report), /Turnos con fallback.*33\.33%/);
});

test("CloudWatch JSON messages can be parsed from exported JSONL", () => {
  const metric = JSON.stringify({
    event: "TURN_COMPLETED",
    totalDurationMs: 100,
  });
  const input = [metric, JSON.stringify({ message: metric }), "not-json"].join(
    "\n",
  );

  assert.equal(parseMetrics(input).length, 2);
});

function turn(overrides) {
  return {
    event: "TURN_COMPLETED",
    totalDurationMs: 0,
    safetyDurationMs: 100,
    indicatorDurationMs: 200,
    narrativeDurationMs: 0,
    summaryAttempted: false,
    summaryDurationMs: 0,
    retryCount: 0,
    retryDurationMs: 0,
    fallbackUsed: false,
    outcome: "continued",
    exceedsEightSeconds: false,
    ...overrides,
  };
}
