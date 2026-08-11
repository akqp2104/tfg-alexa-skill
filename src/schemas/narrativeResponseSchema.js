const { z } = require("zod");

const choiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  synonyms: z.array(z.string()).max(5),
});

const characterEmotionSchema = z.object({
  primary: z.string().min(1),
  intensity: z.number().int().min(0).max(3),
});

const relationshipSchema = z.object({
  trust: z.number().int().min(0).max(3),
  tension: z.number().int().min(0).max(3),
});

const narrativeResponseSchema = z.object({
  narrative: z.string().min(1).max(900),

  reprompt: z.string().min(1).max(300),

  choices: z.array(choiceSchema).min(2).max(3),

  narrativeStateUpdate: z.object({
    scene: z.string().min(1),

    location: z.string().nullable(),

    timeOfDay: z.string().nullable(),

    characterEmotion: characterEmotionSchema,

    characterGoal: z.string().nullable(),

    relationships: z.record(z.string(), relationshipSchema),

    openConflicts: z.array(z.string()),

    commitments: z.array(z.string()),

    recentEvents: z.array(z.string()).max(5),

    storyProgress: z.enum([
      "introduction",
      "development",
      "climax",
      "resolution",
    ]),
  }),
});

module.exports = narrativeResponseSchema;
