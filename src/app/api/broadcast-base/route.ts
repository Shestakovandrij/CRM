import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const niche = url.searchParams.get("niche")?.trim();
  const sort = url.searchParams.get("sort") === "asc" ? "asc" : "desc";

  const where: Prisma.BroadcastLeadWhereInput = {
    ...(search && { instagram: { contains: search, mode: "insensitive" } }),
    ...(niche && niche !== "all" && (niche === "none" ? { niche: null } : { niche })),
  };

  const [leads, niches] = await Promise.all([
    db.broadcastLead.findMany({
      where,
      // nulls last — картки без успішної відправки не мають витісняти реальні.
      orderBy: { lastSentAt: { sort, nulls: "last" } },
      include: {
        sends: {
          orderBy: { sentAt: "desc" },
          select: {
            id: true,
            campaignId: true,
            campaignName: true,
            messageText: true,
            status: true,
            sentAt: true,
          },
        },
      },
    }),
    db.broadcastLead.findMany({
      where: { niche: { not: null } },
      distinct: ["niche"],
      select: { niche: true },
      orderBy: { niche: "asc" },
    }),
  ]);

  return NextResponse.json({
    leads,
    niches: niches.map((n) => n.niche).filter(Boolean),
  });
}
