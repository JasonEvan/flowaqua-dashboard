import { z } from "zod";

const readingSchema = z.object({
  id: z.string(),
  tdsPpm: z.number().finite().nonnegative(),
  temperatureC: z.number().finite().min(-273.15),
  recordedAt: z.string().datetime({ offset: true }),
});
const readingsSchema = z.array(readingSchema);
export type Reading = z.infer<typeof readingSchema>;
export function isReadingList(value: unknown): value is Reading[] {
  return readingsSchema.safeParse(value).success;
}
export function apiErrorMessage(value: unknown): string {
  const result = z.object({ message: z.string() }).safeParse(value);
  return result.success ? result.data.message : "Koneksi API terganggu.";
}
