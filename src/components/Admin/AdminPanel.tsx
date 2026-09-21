"use client";

import { useState, useTransition } from "react";
import {
  createTeamAction,
  deleteTeamAction,
  updateUserTeamAction,
  updateUserRoleAction,
  deleteUserAction,
} from "@/lib/actions/admin";
import { Users, Trash2, Plus, Shield, ShieldAlert, UserCheck } from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  _count: { members: number };
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "USER" | "ADMIN";
  teamId: string | null;
  team: { id: string; name: string } | null;
}

interface AdminPanelProps {
  currentUserId: string;
  initialTeams: TeamItem[];
  initialUsers: UserItem[];
}

export default function AdminPanel({
  currentUserId,
  initialTeams,
  initialUsers,
}: AdminPanelProps) {
  const [teams, setTeams] = useState<TeamItem[]>(initialTeams);
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (success?: string, error?: string) => {
    if (error) {
      setErrorMsg(error);
      setSuccessMsg(null);
    } else if (success) {
      setSuccessMsg(success);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createTeamAction(formData);
      if (res.error) {
        showNotification(undefined, res.error);
      } else {
        showNotification("Équipe créée avec succès !");
        form.reset();
        window.location.reload();
      }
    });
  };

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    if (!confirm(`Êtes-vous certain de vouloir supprimer l'équipe "${teamName}" ? Les membres ne seront pas supprimés mais détachés de l'équipe.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteTeamAction(teamId);
      if (res.error) {
        showNotification(undefined, res.error);
      } else {
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        setUsers((prev) =>
          prev.map((u) => (u.teamId === teamId ? { ...u, teamId: null, team: null } : u))
        );
        showNotification(`L'équipe "${teamName}" a été supprimée.`);
      }
    });
  };

  const handleChangeUserTeam = (userId: string, newTeamId: string) => {
    const targetTeamId = newTeamId === "" ? null : newTeamId;
    const targetTeamObj = teams.find((t) => t.id === targetTeamId) || null;

    startTransition(async () => {
      await updateUserTeamAction(userId, targetTeamId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, teamId: targetTeamId, team: targetTeamObj ? { id: targetTeamObj.id, name: targetTeamObj.name } : null }
            : u
        )
      );
      showNotification("Équipe de l'utilisateur mise à jour !");
    });
  };

  const handleToggleUserRole = (userId: string, currentRole: "USER" | "ADMIN") => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    if (userId === currentUserId && newRole === "USER") {
      alert("Vous ne pouvez pas retirer vos propres privilèges d'administrateur.");
      return;
    }

    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.error) {
        showNotification(undefined, res.error);
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        showNotification(`Rôle de l'utilisateur mis à jour (${newRole}).`);
      }
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUserId) {
      alert("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    if (!confirm(`Êtes-vous certain de vouloir supprimer l'utilisateur "${userName}" ? Toutes ses présences seront également supprimées.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (res.error) {
        showNotification(undefined, res.error);
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showNotification(`L'utilisateur "${userName}" a été supprimé.`);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Alertes globales */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl">
          {successMsg}
        </div>
      )}

      {/* SECTION 1 : GESTION DES ÉQUIPES */}
      <section className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--primary)]" />
              Gestion des Équipes ({teams.length})
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              Chaque utilisateur ne voit que les présences de son équipe respective.
            </p>
          </div>

          <form onSubmit={handleCreateTeam} className="flex gap-2">
            <input
              name="name"
              type="text"
              required
              placeholder="Nom de l'équipe (ex. RH, Dev)..."
              className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-white focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="px-3.5 py-1.5 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:opacity-95 transition flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Créer</span>
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="p-4 rounded-xl border border-[var(--border)] bg-gray-50/50 flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold text-sm text-[var(--text)]">{team.name}</h3>
                <span className="text-xs text-[var(--muted)]">
                  {users.filter((u) => u.teamId === team.id).length} membre(s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteTeam(team.id, team.name)}
                disabled={isPending}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Supprimer cette équipe"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {teams.length === 0 && (
            <div className="col-span-full py-6 text-center text-sm text-[var(--muted)]">
              Aucune équipe créée pour l'instant.
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2 : GESTION DES UTILISATEURS */}
      <section className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <div className="mb-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            Gestion des Utilisateurs ({users.length})
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Attribuez les équipes, gérez les rôles d'administrateur ou supprimez des comptes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] text-xs uppercase font-semibold">
                <th className="pb-3 px-2">Utilisateur</th>
                <th className="pb-3 px-2">Courriel</th>
                <th className="pb-3 px-2">Équipe rattachée</th>
                <th className="pb-3 px-2">Rôle</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-2 font-medium text-[var(--text)]">
                      {u.firstName} {u.lastName}
                      {isSelf && (
                        <span className="ml-2 text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                          Vous
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-[var(--muted)]">{u.email}</td>
                    <td className="py-3 px-2">
                      <select
                        value={u.teamId || ""}
                        onChange={(e) => handleChangeUserTeam(u.id, e.target.value)}
                        disabled={isPending}
                        className="text-xs px-2 py-1 bg-white border border-[var(--border)] rounded-md cursor-pointer focus:ring-1 focus:ring-[var(--primary)]"
                      >
                        <option value="">(Aucune équipe)</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        type="button"
                        onClick={() => handleToggleUserRole(u.id, u.role)}
                        disabled={isPending || isSelf}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                          u.role === "ADMIN"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                        }`}
                        title={isSelf ? "Vous ne pouvez pas modifier votre propre rôle" : "Cliquer pour basculer le rôle"}
                      >
                        {u.role === "ADMIN" ? (
                          <>
                            <ShieldAlert className="w-3 h-3" />
                            Admin
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3" />
                            Utilisateur
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                          disabled={isPending}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer cet utilisateur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}