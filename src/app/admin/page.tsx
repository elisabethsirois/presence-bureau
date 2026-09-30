import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import AdminPanel from "@/components/Admin/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();

  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { members: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      emailVerified: true,
      teamId: true,
      createdAt: true,
      team: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });

  const invitations = await prisma.invitation.findMany({
    select: {
      id: true,
      email: true,
      teamId: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      team: {
        select: { id: true, name: true },
      },
      invitedBy: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const auditLogs = await prisma.auditLog.findMany({
    take: 40,
    select: {
      id: true,
      action: true,
      target: true,
      details: true,
      ipAddress: true,
      createdAt: true,
      actor: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const currentTeam = session.teamId
    ? await prisma.team.findUnique({ where: { id: session.teamId } })
    : null;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-[var(--bg)]">
      <div className="max-w-[1240px] mx-auto">
        <Navbar user={session} activeTeamName={currentTeam?.name} />
        <AdminPanel
          currentUserId={session.id}
          initialTeams={teams}
          initialUsers={users}
          initialInvitations={invitations.map((inv) => ({
            ...inv,
            expiresAt: inv.expiresAt.toISOString(),
            createdAt: inv.createdAt.toISOString(),
          }))}
          initialAuditLogs={auditLogs.map((log) => ({
            ...log,
            createdAt: log.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}