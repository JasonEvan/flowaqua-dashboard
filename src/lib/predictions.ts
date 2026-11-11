import { z } from "zod";

const predictionSchema = z.object({
  predictedTds: z.number().finite(),
  targetStart: z.string().datetime({ offset: true }),
  targetEnd: z.string().datetime({ offset: true }),
  cycleId: z.string(),
});
const currentSchema = z.discriminatedUnion("status", [
  predictionSchema.extend({ status: z.literal("available") }),
  z.object({ status: z.literal("unavailable") }),
]);
const historySchema = z.array(predictionSchema).max(100);

export type Prediction = z.infer<typeof predictionSchema>;
export type CurrentPrediction = z.infer<typeof currentSchema>;
export function isCurrentPrediction(
  value: unknown,
): value is CurrentPrediction {
  return currentSchema.safeParse(value).success;
}
export function isPredictionHistory(value: unknown): value is Prediction[] {
  return historySchema.safeParse(value).success;
}
