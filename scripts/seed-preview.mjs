#!/usr/bin/env node
/**
 * Fills a LOCAL database with two preview accounts so every screen can be
 * looked at without Google: a student mid-week ("Maya", calendar marked as
 * connected) and a brand-new account (nothing yet, not connected). Prints a
 * login session for each, for scripts/screenshots.mjs.
 *
 *   node --env-file=.env.local scripts/seed-preview.mjs
 *
 * Refuses to run unless DATABASE_URL points at localhost. It deletes and
 * recreates only the two preview users (emails ending @preview.local).
 */
import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error("seed-preview: DATABASE_URL is not a localhost database. Refusing to run.");
  process.exit(1);
}

const prisma = new PrismaClient();
const hm = (h, m = 0) => h * 60 + m;
const WEEKDAYS = [1, 2, 3, 4, 5];

const PROFILES = [
  { name: "Study", color: "#6366f1", buffer: 10, min: 30, max: 120, isDefault: true, windows: [[WEEKDAYS, 9, 21], [[6, 7], 11, 20]] },
  { name: "Classes", color: "#0ea5e9", buffer: 10, min: 50, max: 90, isDefault: false, windows: [[WEEKDAYS, 8, 18]] },
  { name: "Job", color: "#f59e0b", buffer: 15, min: 60, max: 240, isDefault: false, windows: [[WEEKDAYS, 16, 22], [[6, 7], 9, 18]] },
  { name: "Personal", color: "#10b981", buffer: 10, min: 30, max: 120, isDefault: false, windows: [[[1, 2, 3, 4, 5, 6, 7], 18, 22]] },
];

/** A time `days` from today at `hour:minute`, in the machine's local zone. */
function at(days, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}
const minutesFromNow = (m) => new Date(Date.now() + m * 60_000);

async function makeUser(email, name) {
  await prisma.user.deleteMany({ where: { email } });
  const user = await prisma.user.create({
    data: { email, name, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });
  const profiles = {};
  for (const [i, p] of PROFILES.entries()) {
    profiles[p.name] = await prisma.profile.create({
      data: {
        userId: user.id,
        name: p.name,
        color: p.color,
        bufferMinutes: p.buffer,
        defaultMinBlockMinutes: p.min,
        defaultMaxBlockMinutes: p.max,
        isDefault: p.isDefault,
        sortOrder: i,
        windows: {
          create: p.windows.flatMap(([days, start, end]) =>
            days.map((dayOfWeek) => ({ dayOfWeek, startMinute: hm(start), endMinute: hm(end) })),
          ),
        },
      },
    });
  }
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: at(30, 0) },
  });
  return { user, profiles, sessionToken };
}

async function task(userId, profileId, t) {
  return prisma.task.create({
    data: {
      userId,
      profileId,
      title: t.title,
      deadline: t.deadline,
      durationMinutes: t.minutes,
      priority: t.priority ?? 2,
      status: t.status ?? "SCHEDULED",
      shortfallMinutes: t.shortfall ?? 0,
      completedAt: t.status === "COMPLETED" ? new Date() : null,
      blocks: {
        create: (t.blocks ?? []).map(([start, end]) => ({ userId, start, end, synced: true })),
      },
    },
  });
}

async function main() {
  const maya = await makeUser("maya@preview.local", "Maya Chen");
  // Marks Google as connected for the preview. The token is not real; nothing
  // here talks to Google.
  await prisma.account.create({
    data: {
      userId: maya.user.id,
      type: "oidc",
      provider: "google",
      providerAccountId: `preview-${maya.user.id}`,
      access_token: "preview-not-a-real-token",
    },
  });
  const id = maya.user.id;
  const { Study, Classes, Job } = maya.profiles;
  await task(id, Study.id, {
    title: "Bio 201 lab report",
    deadline: at(2, 17),
    minutes: 150,
    blocks: [[minutesFromNow(-52), minutesFromNow(38)], [at(1, 16), at(1, 17)]],
  });
  await task(id, Study.id, {
    title: "Chem problem set 4",
    deadline: at(4, 23, 59),
    minutes: 90,
    priority: 3,
    blocks: [[at(2, 19), at(2, 20, 30)]],
  });
  await task(id, Classes.id, {
    title: "Read Psych 101, chapter 6",
    deadline: at(5, 9),
    minutes: 60,
    blocks: [[at(3, 14), at(3, 15)]],
  });
  await task(id, Study.id, {
    title: "Draft history essay outline",
    deadline: at(-1, 17),
    minutes: 90,
    status: "UNSCHEDULABLE",
    shortfall: 30,
    blocks: [],
  });
  await task(id, Job.id, {
    title: "Swap Saturday café shift",
    deadline: at(6, 12),
    minutes: 30,
    blocks: [[at(5, 18), at(5, 18, 30)]],
  });
  await task(id, Study.id, {
    title: "Email lab partner the data",
    deadline: at(0, 12),
    minutes: 15,
    status: "COMPLETED",
    blocks: [],
  });

  const fresh = await makeUser("new@preview.local", null);

  process.stdout.write(
    JSON.stringify({ maya: maya.sessionToken, fresh: fresh.sessionToken }) + "\n",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
