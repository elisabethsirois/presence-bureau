import { prisma } from "@/lib/db";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <RegisterForm teams={teams} />;
}