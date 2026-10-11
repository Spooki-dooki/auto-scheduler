import { prisma } from "@/lib/db";

type WindowSeed = { days: number[]; start: number; end: number };

const hm = (h: number, m = 0) => h * 60 + m;

const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Every new account starts with the four profiles the app is built around, so
 * the first task a user enters has somewhere to go without any setup.
 */
const DEFAULT_PROFILES: Array<{
  name: string;
  color: string;
  bufferMinutes: number;
  minBlock: number;
  maxBlock: number;
  isDefault: boolean;
  windows: WindowSeed[];
}> = [
  {
    name: "Study",
    color: "#6366f1",
    bufferMinutes: 10,
    minBlock: 30,
    maxBlock: 120,
    isDefault: true,
    windows: [
      { days: WEEKDAYS, start: hm(9), end: hm(21) },
      { days: [6, 7], start: hm(11), end: hm(20) },
    ],
  },
  {
    name: "Classes",
    color: "#0ea5e9",
    bufferMinutes: 10,
    minBlock: 50,
    maxBlock: 90,
    isDefault: false,
    windows: [{ days: WEEKDAYS, start: hm(8), end: hm(18) }],
  },
  {
    name: "Job",
    color: "#f59e0b",
    bufferMinutes: 15,
    minBlock: 60,
    maxBlock: 240,
    isDefault: false,
    windows: [
      { days: WEEKDAYS, start: hm(16), end: hm(22) },
      { days: [6, 7], start: hm(9), end: hm(18) },
    ],
  },
  {
    name: "Personal",
    color: "#10b981",
    bufferMinutes: 10,
    minBlock: 30,
    maxBlock: 120,
    isDefault: false,
    windows: [{ days: ALL_DAYS, start: hm(18), end: hm(22) }],
  },
];

export async function seedDefaultProfiles(userId: string): Promise<void> {
  const existing = await prisma.profile.count({ where: { userId } });
  if (existing > 0) return;

  for (const [index, seed] of DEFAULT_PROFILES.entries()) {
    await prisma.profile.create({
      data: {
        userId,
        name: seed.name,
        color: seed.color,
        bufferMinutes: seed.bufferMinutes,
        defaultMinBlockMinutes: seed.minBlock,
        defaultMaxBlockMinutes: seed.maxBlock,
        isDefault: seed.isDefault,
        sortOrder: index,
        windows: {
          create: seed.windows.flatMap((w) =>
            w.days.map((dayOfWeek) => ({
              dayOfWeek,
              startMinute: w.start,
              endMinute: w.end,
            })),
          ),
        },
      },
    });
  }
}

export async function getDefaultProfileId(userId: string): Promise<string | null> {
  const profile =
    (await prisma.profile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    })) ??
    (await prisma.profile.findFirst({
      where: { userId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    }));

  return profile?.id ?? null;
}
