function createInitialGameState(sessionId) {
  return {
    sessionId,
    turn: 0,

    narrativeState: {
      scene: "inicio",
      location: null,
      timeOfDay: null,

      characterEmotion: {
        primary: "neutral",
        intensity: 0,
      },

      characterGoal: null,
      relationships: {},
      openConflicts: [],
      commitments: [],
      recentEvents: [],
      storyProgress: "introduction",
    },

    currentChoices: [],

    indicators: {
      lowMood: { score: 0, evidenceCount: 0 },
      anhedonia: { score: 0, evidenceCount: 0 },
      lowEnergy: { score: 0, evidenceCount: 0 },
      lowSelfWorth: { score: 0, evidenceCount: 0 },
      socialWithdrawal: { score: 0, evidenceCount: 0 },
      worry: { score: 0, evidenceCount: 0 },
      tension: { score: 0, evidenceCount: 0 },
      avoidance: { score: 0, evidenceCount: 0 },
      somaticAnxiety: { score: 0, evidenceCount: 0 },
      sleepDisturbance: { score: 0, evidenceCount: 0 },
      concentrationDifficulty: { score: 0, evidenceCount: 0 },
    },

    safetyState: {
      state: "NORMAL",
      phase: null,
    },

    narrativeSummary: "",
  };
}

module.exports = createInitialGameState;
