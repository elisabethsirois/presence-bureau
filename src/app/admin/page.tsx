import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import AdminPanel from "@/components/Admin/AdminPanel";

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
      teamId: true,
      team: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
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
        />
      </div>
    </div>
  );
}