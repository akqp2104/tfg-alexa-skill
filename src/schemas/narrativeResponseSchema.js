const { z } = require("zod");

const choiceSchema = z.object({
  id: z.string().min(1).max(80),
  text: z.string().min(1).max(120),
  synonyms: z.array(z.string().min(1).max(100)).max(5),
});

const relationshipSchema = z.object({
  trust: z.number().int().min(0).max(3),
  tension: z.number().int().min(0).max(3),
});

const narrativeStateUpdateSchema = z.object({
  scene: z.string().min(1).max(120),
  location: z.string().max(120).nullable(),
  timeOfDay: z.string().max(50).nullable(),
  characterEmotion: z.object({
    primary: z.string().min(1).max(50),

    intensity: z.number().int().min(0).max(3),
  }),
  characterGoal: z.string().max(200).nullable(),
  relationships: z.record(z.string(), relationshipSchema),
  openConflicts: z.array(z.string().min(1).max(250)).max(5),
  commitments: z.array(z.string().min(1).max(250)).max(5),
  recentEvents: z.array(z.string().min(1).max(250)).max(5),
  storyProgress: z.enum([
    "introduction",
    "development",
    "climax",
    "resolution",
  ]),
}).strict();

const narrativeResponseSchema = z
  .object({
    narrative: z.string().min(1).max(1000),
    reprompt: z.string().max(250),
    storyComplete: z.boolean(),
    choices: z.array(choiceSchema).max(3),
    narrativeStateUpdate: narrativeStateUpdateSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.storyComplete && data.choices.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["choices"],
        message: "A non-final scene must provide at least 2 choices",
      });
    }

    if (data.storyComplete && data.choices.length !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["choices"],
        message: "A final scene must not provide choices",
      });
    }
  });

module.exports = narrativeResponseSchema;
