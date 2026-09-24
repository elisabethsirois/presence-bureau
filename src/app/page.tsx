import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Navbar from "@/components/Navbar";
import CalendarView from "@/components/Calendar/CalendarView";
import Link from "next/link";
import { Shield, Users } from "lucide-react";

export default async function HomePage() {
  const session = await requireAuth();

  // Si admin, charger toutes les équipes disponibles
  const allTeams = session.role === "ADMIN"
    ? await prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Équipe active (soit celle du user, soit la 1ère équipe si l'admin n'en a pas)
  const activeTeamId = session.teamId || (session.role === "ADMIN" && allTeams.length > 0 ? allTeams[0].id : null);

  let activeTeam = null;
  let teamMembers: { id: string; firstName: string; lastName: string }[] = [];
  let initialPresences: { date: string; userId: string; amStatus: string; pmStatus: string }[] = [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (activeTeamId) {
    activeTeam = await prisma.team.findUnique({
      where: { id: activeTeamId },
    });

    teamMembers = await prisma.user.findMany({
      where: { teamId: activeTeamId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    });

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    initialPresences = await prisma.presence.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        user: { teamId: activeTeamId },
      },
      select: {
        date: true,
        userId: true,
        amStatus: true,
        pmStatus: true,
      },
    });
  }

  return (
    <div className="min-h-screen p-1.5 sm:p-6 lg:p-8 bg-[var(--bg)]">
      <div className="max-w-[1240px] mx-auto">
        <div className="hidden md:block">
          <Navbar user={session} activeTeamName={activeTeam?.name} />
        </div>

        {!activeTeamId ? (
          <div className="bg-[var(--card-bg)] border border-yellow-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm mt-8">
            <Users className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">
              Aucune équipe assignée
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              Vous n&apos;êtes actuellement rattaché(e) à aucune équipe. Un administrateur doit vous affecter à une équipe pour voir et renseigner vos présences.
            </p>
            {session.role === "ADMIN" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
              >
                <Shield className="w-4 h-4" />
                Créer ou gérer les équipes
              </Link>
            )}
          </div>
        ) : (
          <CalendarView
            currentUser={session}
            initialYear={year}
            initialMonth={month}
            initialMembers={teamMembers}
            initialPresences={initialPresences}
            allTeams={allTeams}
            activeTeamId={activeTeamId}
          />
        )}
      </div>
    </div>
  );
}