import { prisma } from "@/lib/db";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  let teams: { id: string; name: string }[] = [];

  try {
    teams = await prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des équipes:", error);
  }

  return <RegisterForm teams={teams} />;
}