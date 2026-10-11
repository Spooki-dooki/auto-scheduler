import { z } from "zod";

const isoDate = z
  .string()
  .min(1, "Pick a deadline")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Not a valid date")
  .transform((value) => new Date(value));

export const taskCreateSchema = z
  .object({
    title: z.string().trim().min(1, "Give the task a name").max(200),
    notes: z.string().trim().max(2000).optional().nullable(),
    deadline: isoDate,
    durationMinutes: z.coerce.number().int().min(5).max(60 * 24),
    priority: z.coerce.number().int().min(1).max(4).default(2),
    profileId: z.string().cuid().optional().nullable(),
    minBlockMinutes: z.coerce.number().int().min(5).max(60 * 12).default(30),
    maxBlockMinutes: z.coerce.number().int().min(5).max(60 * 12).default(120),
  })
  .refine((data) => data.maxBlockMinutes >= data.minBlockMinutes, {
    message: "Longest block cannot be shorter than the shortest block",
    path: ["maxBlockMinutes"],
  });

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  deadline: isoDate.optional(),
  durationMinutes: z.coerce.number().int().min(5).max(60 * 24).optional(),
  priority: z.coerce.number().int().min(1).max(4).optional(),
  profileId: z.string().cuid().nullable().optional(),
  minBlockMinutes: z.coerce.number().int().min(5).max(60 * 12).optional(),
  maxBlockMinutes: z.coerce.number().int().min(5).max(60 * 12).optional(),
  status: z.enum(["PENDING", "SCHEDULED", "COMPLETED", "ARCHIVED"]).optional(),
});

const windowSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(1).max(7),
    startMinute: z.coerce.number().int().min(0).max(1439),
    endMinute: z.coerce.number().int().min(1).max(1440),
  })
  .refine((w) => w.endMinute !== w.startMinute, {
    message: "A window needs a length",
    path: ["endMinute"],
  });

export const profileCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #6366f1")
    .default("#6366f1"),
  bufferMinutes: z.coerce.number().int().min(0).max(120).default(10),
  defaultMinBlockMinutes: z.coerce.number().int().min(5).max(720).default(30),
  defaultMaxBlockMinutes: z.coerce.number().int().min(5).max(720).default(120),
  isDefault: z.boolean().default(false),
  windows: z.array(windowSchema).max(60).default([]),
});

export const profileUpdateSchema = profileCreateSchema.partial();

export const settingsSchema = z.object({
  timeZone: z.string().trim().min(1).max(80).optional(),
  calendarId: z.string().trim().min(1).max(200).optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
