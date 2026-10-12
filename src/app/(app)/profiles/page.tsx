import type { Metadata } from "next";
import { redirect } from "next/navigation";

import ProfileEditor from "@/components/ProfileEditor";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hours" };

export default async function ProfilesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const profiles = await prisma.profile.findMany({
    where: { userId },
    include: {
      windows: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] },
      _count: { select: { tasks: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="t-display text-text">Your hours</h1>
        <p className="mt-2 max-w-2xl t-body text-soft">
          A task tagged with a set of hours is only ever placed inside them. Keep study time out
          of your shift, and your shift out of your evening. Choose a day to change it.
        </p>
      </div>

      <ProfileEditor
        profiles={profiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          color: profile.color,
          bufferMinutes: profile.bufferMinutes,
          defaultMinBlockMinutes: profile.defaultMinBlockMinutes,
          defaultMaxBlockMinutes: profile.defaultMaxBlockMinutes,
          isDefault: profile.isDefault,
          taskCount: profile._count.tasks,
          windows: profile.windows.map((w) => ({
            dayOfWeek: w.dayOfWeek,
            startMinute: w.startMinute,
            endMinute: w.endMinute,
          })),
        }))}
      />
    </div>
  );
}
