"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { SessionUser } from "@/lib/auth";
import {
  togglePresenceAction,
  setDayPresenceAction,
  batchSetPresencesAction,
  getMonthPresencesAction,
} from "@/lib/actions/presence";
import {
  Calendar as CalendarIcon,
  Building2,
  Home,
  Palmtree,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Settings,
  Clock,
  ArrowRightLeft,
  Check,
  X,
  Search,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import InstallPwaPrompt from "@/components/PWA/InstallPwaPrompt";

export type StatusType = "NONE" | "OFFICE" | "REMOTE" | "ABSENT";

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
}

export interface PresenceRecord {
  date: string;
  userId: string;
  amStatus: string;
  pmStatus: string;
}

interface MobileReservationViewProps {
  currentUser: SessionUser;
  initialYear: number;
  initialMonth: number;
  initialMembers: TeamMember[];
  initialPresences: PresenceRecord[];
  allTeams?: { id: string; name: string }[];
  activeTeamId?: string | null;
  onSwitchToDesktop?: () => void;
}

type TabType = "reserve" | "team" | "month" | "settings";

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; shortLabel: string; icon: string; bg: string; text: string; border: string }
> = {
  NONE: {
    label: "Non renseigné",
    shortLabel: "—",
    icon: "⚪",
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
  },
  OFFICE: {
    label: "Bureau",
    shortLabel: "Bureau",
    icon: "🏢",
    bg: "bg-[var(--office)]",
    text: "text-[var(--office-text)]",
    border: "border-[var(--office-border)]",
  },
  REMOTE: {
    label: "Télétravail",
    shortLabel: "TT",
    icon: "🏠",
    bg: "bg-[var(--remote)]",
    text: "text-[var(--remote-text)]",
    border: "border-[var(--remote-border)]",
  },
  ABSENT: {
    label: "Absent",
    shortLabel: "Absent",
    icon: "🌴",
    bg: "bg-[var(--absent)]",
    text: "text-[var(--absent-text)]",
    border: "border-[var(--absent-border)]",
  },
};

// Formattage date YYYY-MM-DD
function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Trouver le lundi de la semaine d'une date donnée
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export default function MobileReservationView({
  currentUser,
  initialYear,
  initialMonth,
  initialMembers,
  initialPresences,
  allTeams,
  activeTeamId: initialActiveTeamId,
  onSwitchToDesktop,
}: MobileReservationViewProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<TabType>("reserve");

  // Selected Team
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(
    initialActiveTeamId || currentUser.teamId || undefined
  );
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialMembers);

  // Presences map
  const [presencesMap, setPresencesMap] = useState<
    Record<string, Record<string, { am: StatusType; pm: StatusType }>>
  >(() => {
    const map: Record<string, Record<string, { am: StatusType; pm: StatusType }>> = {};
    for (const p of initialPresences) {
      if (!map[p.date]) map[p.date] = {};
      map[p.date][p.userId] = {
        am: (p.amStatus as StatusType) || "NONE",
        pm: (p.pmStatus as StatusType) || "NONE",
      };
    }
    return map;
  });

  // Current Week reference date (starts on Monday)
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(today));

  // Current Month for Month view
  const [monthDate, setMonthDate] = useState<Date>(
    () => new Date(initialYear, initialMonth - 1, 1)
  );

  // Selected Date for "Team" (Qui est là ?) tab & Modal
  const [selectedTeamDate, setSelectedTeamDate] = useState<string>(todayKey);

  // Quick preset drawer
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detail modal for a day
  const [detailDateKey, setDetailDateKey] = useState<string | null>(null);

  // Search filter for Team tab
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  const [, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20);
    }
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Chargement des données pour un mois / équipe
  const loadMonthData = (targetDate: Date, targetTeamId?: string) => {
    startTransition(async () => {
      const res = await getMonthPresencesAction(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        targetTeamId || selectedTeamId
      );

      setTeamMembers(res.teamMembers);
      const newMap: Record<string, Record<string, { am: StatusType; pm: StatusType }>> = {};
      for (const p of res.presences) {
        if (!newMap[p.date]) newMap[p.date] = {};
        newMap[p.date][p.userId] = {
          am: (p.amStatus as StatusType) || "NONE",
          pm: (p.pmStatus as StatusType) || "NONE",
        };
      }
      setPresencesMap((prev) => ({ ...prev, ...newMap }));
    });
  };

  // Semaine jours (Lundi à Vendredi)
  const weekDays = useMemo(() => {
    const days: { date: Date; dateKey: string; dayName: string; dayNumber: number; isToday: boolean }[] = [];
    const base = new Date(weekStart);
    for (let i = 0; i < 5; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dKey = formatDateKey(d);
      const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d);
      days.push({
        date: d,
        dateKey: dKey,
        dayName: dayName.replace(".", ""),
        dayNumber: d.getDate(),
        isToday: dKey === todayKey,
      });
    }
    return days;
  }, [weekStart, todayKey]);

  // Format affichage semaine
  const weekLabel = useMemo(() => {
    const start = weekDays[0]?.date;
    const end = weekDays[4]?.date;
    if (!start || !end) return "";
    const startStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(start);
    const endStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(end);
    return `${startStr} — ${endStr}`;
  }, [weekDays]);

  const handlePrevWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() - 7);
    setWeekStart(next);
    // Vérifier si le mois a changé pour charger les présences si nécessaire
    if (next.getMonth() !== monthDate.getMonth()) {
      setMonthDate(new Date(next.getFullYear(), next.getMonth(), 1));
      loadMonthData(next);
    }
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
    if (next.getMonth() !== monthDate.getMonth()) {
      setMonthDate(new Date(next.getFullYear(), next.getMonth(), 1));
      loadMonthData(next);
    }
  };

  const handleCurrentWeek = () => {
    const mon = getMonday(today);
    setWeekStart(mon);
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // 1-Tap set whole day status for current user
  const handleSetDayStatus = async (dateKey: string, status: StatusType, period: "all" | "am" | "pm" = "all") => {
    const prevEntry = presencesMap[dateKey]?.[currentUser.id] || { am: "NONE", pm: "NONE" };

    let newAm = prevEntry.am;
    let newPm = prevEntry.pm;

    if (period === "all") {
      // Si déjà ce statut, un second clic efface (toggle)
      if (prevEntry.am === status && prevEntry.pm === status) {
        newAm = "NONE";
        newPm = "NONE";
      } else {
        newAm = status;
        newPm = status;
      }
    } else if (period === "am") {
      newAm = prevEntry.am === status ? "NONE" : status;
    } else if (period === "pm") {
      newPm = prevEntry.pm === status ? "NONE" : status;
    }

    // Mise à jour optimiste
    setPresencesMap((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {}),
        [currentUser.id]: { am: newAm, pm: newPm },
      },
    }));

    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }

    try {
      if (period === "all") {
        await setDayPresenceAction(dateKey, newAm, "all");
      } else {
        await setDayPresenceAction(dateKey, period === "am" ? newAm : newPm, period);
      }
    } catch {
      // Revert en cas d'erreur
      setPresencesMap((prev) => ({
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          [currentUser.id]: prevEntry,
        },
      }));
      showToast("Erreur lors de l'enregistrement");
    }
  };

  // Batch Presets
  const handleApplyPreset = async (presetType: "office_all" | "hybrid_3_2" | "hybrid_2_3" | "remote_all" | "clear_all") => {
    setShowPresetModal(false);

    const updates: {
      date: string;
      amStatus: StatusType;
      pmStatus: StatusType;
    }[] = [];

    weekDays.forEach((day, index) => {
      let st: StatusType = "NONE";
      if (presetType === "office_all") {
        st = "OFFICE";
      } else if (presetType === "remote_all") {
        st = "REMOTE";
      } else if (presetType === "hybrid_3_2") {
        // Lun, Mar, Mer = Bureau, Jeu, Ven = Télétravail
        st = index < 3 ? "OFFICE" : "REMOTE";
      } else if (presetType === "hybrid_2_3") {
        // Mar, Jeu = Bureau, Lun, Mer, Ven = Télétravail
        st = index === 1 || index === 3 ? "OFFICE" : "REMOTE";
      } else if (presetType === "clear_all") {
        st = "NONE";
      }

      updates.push({
        date: day.dateKey,
        amStatus: st,
        pmStatus: st,
      });
    });

    // Optimistic local update
    setPresencesMap((prev) => {
      const copy = { ...prev };
      for (const u of updates) {
        if (!copy[u.date]) copy[u.date] = {};
        copy[u.date][currentUser.id] = { am: u.amStatus, pm: u.pmStatus };
      }
      return copy;
    });

    showToast("Modèle de semaine appliqué !");

    try {
      await batchSetPresencesAction(updates);
    } catch {
      showToast("Erreur lors de l'application du modèle");
      loadMonthData(weekStart);
    }
  };

  // Données de l'équipe pour un jour spécifique
  const getDayPresenceBreakdown = useCallback((dateKey: string) => {
    const atOffice: { member: TeamMember; period: "all" | "am" | "pm" }[] = [];
    const atRemote: { member: TeamMember; period: "all" | "am" | "pm" }[] = [];
    const atAbsent: { member: TeamMember; period: "all" | "am" | "pm" }[] = [];
    const notSet: TeamMember[] = [];

    for (const m of teamMembers) {
      const entry = presencesMap[dateKey]?.[m.id];
      const am = entry?.am || "NONE";
      const pm = entry?.pm || "NONE";

      if (am === "NONE" && pm === "NONE") {
        notSet.push(m);
      } else if (am === "OFFICE" && pm === "OFFICE") {
        atOffice.push({ member: m, period: "all" });
      } else if (am === "OFFICE" && pm !== "OFFICE") {
        atOffice.push({ member: m, period: "am" });
        if (pm === "REMOTE") atRemote.push({ member: m, period: "pm" });
        else if (pm === "ABSENT") atAbsent.push({ member: m, period: "pm" });
      } else if (pm === "OFFICE" && am !== "OFFICE") {
        atOffice.push({ member: m, period: "pm" });
        if (am === "REMOTE") atRemote.push({ member: m, period: "am" });
        else if (am === "ABSENT") atAbsent.push({ member: m, period: "am" });
      } else if (am === "REMOTE" && pm === "REMOTE") {
        atRemote.push({ member: m, period: "all" });
      } else if (am === "ABSENT" && pm === "ABSENT") {
        atAbsent.push({ member: m, period: "all" });
      } else {
        if (am === "REMOTE") atRemote.push({ member: m, period: "am" });
        if (pm === "REMOTE") atRemote.push({ member: m, period: "pm" });
        if (am === "ABSENT") atAbsent.push({ member: m, period: "am" });
        if (pm === "ABSENT") atAbsent.push({ member: m, period: "pm" });
      }
    }

    return { atOffice, atRemote, atAbsent, notSet };
  }, [teamMembers, presencesMap]);

  // Liste filtrée des collègues pour l'onglet Équipe
  const filteredTeamBreakdown = useMemo(() => {
    const raw = getDayPresenceBreakdown(selectedTeamDate);
    if (!teamSearchQuery.trim()) return raw;

    const q = teamSearchQuery.toLowerCase();
    const filterFn = (item: { member: TeamMember }) =>
      `${item.member.firstName} ${item.member.lastName}`.toLowerCase().includes(q);

    return {
      atOffice: raw.atOffice.filter(filterFn),
      atRemote: raw.atRemote.filter(filterFn),
      atAbsent: raw.atAbsent.filter(filterFn),
      notSet: raw.notSet.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
      ),
    };
  }, [selectedTeamDate, teamSearchQuery, getDayPresenceBreakdown]);

  // Calcul du calendrier mensuel compact
  const monthCalendarData = useMemo(() => {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const firstDayIndex = (new Date(y, m, 1).getDay() + 6) % 7;
    const totalDays = new Date(y, m + 1, 0).getDate();
    const cellsCount = Math.ceil((firstDayIndex + totalDays) / 7) * 7;
    const monthName = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(monthDate);

    return { y, m, firstDayIndex, totalDays, cellsCount, monthName };
  }, [monthDate]);

  return (
    <div className="w-full max-w-md mx-auto pb-24 text-[var(--text)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-30 bg-[var(--card-bg)]/95 backdrop-blur-md px-4 py-3 border-b border-[var(--border)] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/20 shrink-0">
            PB
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate leading-tight">
              {currentUser.firstName} {currentUser.lastName}
            </h1>
            <p className="text-[11px] text-[var(--muted)] flex items-center gap-1 truncate">
              <Users className="w-3 h-3 inline text-blue-600" />
              <span>
                {allTeams?.find((t) => t.id === selectedTeamId)?.name || "Équipe"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onSwitchToDesktop && (
            <button
              onClick={onSwitchToDesktop}
              className="p-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg flex items-center gap-1"
              title="Basculer vers la vue calendrier de bureau"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden xs:inline">Grille</span>
            </button>
          )}

          <button
            onClick={() => setShowPwaInstallModal(true)}
            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1"
            title="Installer l'application sur votre écran d'accueil"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold hidden xs:inline">App</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RÉSERVER (VUE SEMAINE EXPRESS) */}
      {activeTab === "reserve" && (
        <div className="p-3.5 space-y-4">
          {/* Week Navigation Header */}
          <div className="bg-[var(--card-bg)] p-3 rounded-2xl border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <button
                onClick={handlePrevWeek}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition active-press"
                title="Semaine précédente"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="text-xs uppercase font-bold tracking-wider text-blue-600">
                  Semaine
                </div>
                <div className="text-sm font-bold text-gray-900 capitalize">
                  {weekLabel}
                </div>
              </div>

              <button
                onClick={handleNextWeek}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition active-press"
                title="Semaine suivante"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleCurrentWeek}
                className="flex-1 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition active-press text-center"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => setShowPresetModal(true)}
                className="flex-1 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition active-press flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Semaine type</span>
              </button>
            </div>
          </div>

          {/* Days of Week List */}
          <div className="space-y-3">
            {weekDays.map((day) => {
              const userDay = presencesMap[day.dateKey]?.[currentUser.id] || {
                am: "NONE",
                pm: "NONE",
              };
              const isFullOffice = userDay.am === "OFFICE" && userDay.pm === "OFFICE";
              const isFullRemote = userDay.am === "REMOTE" && userDay.pm === "REMOTE";
              const isFullAbsent = userDay.am === "ABSENT" && userDay.pm === "ABSENT";
              const isMixed =
                !isFullOffice &&
                !isFullRemote &&
                !isFullAbsent &&
                (userDay.am !== "NONE" || userDay.pm !== "NONE");

              const breakdown = getDayPresenceBreakdown(day.dateKey);
              const officeCount = breakdown.atOffice.length;

              return (
                <div
                  key={day.dateKey}
                  className={`bg-[var(--card-bg)] rounded-2xl p-3.5 border transition shadow-xs ${
                    day.isToday
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-[var(--border)]"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${
                          day.isToday
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold leading-none opacity-80">
                          {day.dayName}
                        </span>
                        <span className="text-xs leading-none mt-0.5">{day.dayNumber}</span>
                      </span>

                      <div>
                        <div className="text-xs font-bold text-gray-900 capitalize">
                          {new Intl.DateTimeFormat("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          }).format(day.date)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {day.isToday && (
                            <span className="text-blue-600 font-bold mr-1.5">● Aujourd&apos;hui</span>
                          )}
                          {officeCount > 0 ? (
                            <span
                              onClick={() => {
                                setSelectedTeamDate(day.dateKey);
                                setActiveTab("team");
                              }}
                              className="text-emerald-700 font-medium cursor-pointer hover:underline"
                            >
                              🏢 {officeCount} au bureau
                            </span>
                          ) : (
                            <span className="text-gray-400">0 au bureau</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Current Status Pill */}
                    <div className="text-right">
                      {isFullOffice ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🏢 Bureau
                        </span>
                      ) : isFullRemote ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                          🏠 Télétravail
                        </span>
                      ) : isFullAbsent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          🌴 Absent
                        </span>
                      ) : isMixed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          AM: {STATUS_CONFIG[userDay.am].shortLabel} | PM:{" "}
                          {STATUS_CONFIG[userDay.pm].shortLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-gray-100 text-gray-500">
                          Non réservé
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Quick Action Buttons (Full Day) */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                    <button
                      type="button"
                      onClick={() => handleSetDayStatus(day.dateKey, "OFFICE", "all")}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-bold border transition active-press flex flex-col items-center justify-center gap-0.5 ${
                        isFullOffice
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Bureau</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetDayStatus(day.dateKey, "REMOTE", "all")}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-bold border transition active-press flex flex-col items-center justify-center gap-0.5 ${
                        isFullRemote
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                          : "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100"
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Télétravail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetDayStatus(day.dateKey, "ABSENT", "all")}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-bold border transition active-press flex flex-col items-center justify-center gap-0.5 ${
                        isFullAbsent
                          ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                          : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                      }`}
                    >
                      <Palmtree className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetDayStatus(day.dateKey, "NONE", "all")}
                      className="py-2 px-1 rounded-xl text-center text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition active-press flex flex-col items-center justify-center gap-0.5"
                      title="Effacer la journée"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Effacer</span>
                    </button>
                  </div>

                  {/* AM / PM Fine-Tuning Controls */}
                  <div className="pt-2 border-t border-dashed border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
                    <span className="font-semibold text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      Demi-journées :
                    </span>

                    <div className="flex items-center gap-2">
                      {/* AM Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          await togglePresenceAction(day.dateKey, "am");
                          loadMonthData(day.date);
                          if (typeof window !== "undefined" && "vibrate" in navigator) {
                            navigator.vibrate(10);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition active-press ${
                          STATUS_CONFIG[userDay.am].border
                        } ${STATUS_CONFIG[userDay.am].bg} ${STATUS_CONFIG[userDay.am].text}`}
                      >
                        AM : {STATUS_CONFIG[userDay.am].shortLabel}
                      </button>

                      {/* PM Button */}
                      <button
                        type="button"
                        onClick={async () => {
                          await togglePresenceAction(day.dateKey, "pm");
                          loadMonthData(day.date);
                          if (typeof window !== "undefined" && "vibrate" in navigator) {
                            navigator.vibrate(10);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition active-press ${
                          STATUS_CONFIG[userDay.pm].border
                        } ${STATUS_CONFIG[userDay.pm].bg} ${STATUS_CONFIG[userDay.pm].text}`}
                      >
                        PM : {STATUS_CONFIG[userDay.pm].shortLabel}
                      </button>
                    </div>
                  </div>

                  {/* Colleagues Chips preview */}
                  {breakdown.atOffice.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-gray-400 mr-1">Au bureau :</span>
                      {breakdown.atOffice.slice(0, 4).map(({ member }) => (
                        <span
                          key={member.id}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200"
                        >
                          {member.firstName}
                        </span>
                      ))}
                      {breakdown.atOffice.length > 4 && (
                        <span
                          onClick={() => {
                            setSelectedTeamDate(day.dateKey);
                            setActiveTab("team");
                          }}
                          className="text-[10px] text-blue-600 font-bold cursor-pointer underline ml-1"
                        >
                          +{breakdown.atOffice.length - 4} autres
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MON ÉQUIPE (QUI EST LÀ ?) */}
      {activeTab === "team" && (
        <div className="p-3.5 space-y-4">
          <div className="bg-[var(--card-bg)] p-3.5 rounded-2xl border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Présences de l&apos;équipe
              </h2>
              <span className="text-xs font-semibold text-gray-500">
                {teamMembers.length} membres
              </span>
            </div>

            {/* Date Pill Selector for this week */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {weekDays.map((d) => (
                <button
                  key={d.dateKey}
                  onClick={() => setSelectedTeamDate(d.dateKey)}
                  className={`px-3 py-2 rounded-xl text-center shrink-0 transition active-press border ${
                    selectedTeamDate === d.dateKey
                      ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="text-[10px] uppercase font-semibold leading-none opacity-80">
                    {d.dayName}
                  </div>
                  <div className="text-xs font-bold mt-0.5">{d.dayNumber}</div>
                </button>
              ))}
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                placeholder="Rechercher un collègue..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section: Au Bureau */}
          <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-3.5 shadow-xs">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Au Bureau ({filteredTeamBreakdown.atOffice.length})
              </span>
            </h3>

            {filteredTeamBreakdown.atOffice.length > 0 ? (
              <div className="space-y-2">
                {filteredTeamBreakdown.atOffice.map(({ member, period }) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center justify-center">
                        {member.firstName.charAt(0)}
                        {member.lastName.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      {period === "all" ? "Toute la journée" : period === "am" ? "Matin (AM)" : "Après-midi (PM)"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic py-2">
                Personne n&apos;a encore réservé au bureau ce jour-là.
              </p>
            )}
          </div>

          {/* Section: En Télétravail */}
          <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-3.5 shadow-xs">
            <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Home className="w-4 h-4 text-indigo-600" />
                En Télétravail ({filteredTeamBreakdown.atRemote.length})
              </span>
            </h3>

            {filteredTeamBreakdown.atRemote.length > 0 ? (
              <div className="space-y-2">
                {filteredTeamBreakdown.atRemote.map(({ member, period }) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-200 text-indigo-800 font-bold text-[11px] flex items-center justify-center">
                        {member.firstName.charAt(0)}
                        {member.lastName.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">
                      {period === "all" ? "Toute la journée" : period === "am" ? "Matin (AM)" : "Après-midi (PM)"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic py-2">
                Aucun membre en télétravail ce jour-là.
              </p>
            )}
          </div>

          {/* Section: Absents */}
          {filteredTeamBreakdown.atAbsent.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-3.5 shadow-xs">
              <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Palmtree className="w-4 h-4 text-rose-600" />
                Absents ({filteredTeamBreakdown.atAbsent.length})
              </h3>
              <div className="space-y-2">
                {filteredTeamBreakdown.atAbsent.map(({ member, period }) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs"
                  >
                    <span className="font-semibold text-gray-900">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                      {period === "all" ? "Journée" : period.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CALENDRIER MENSUEL MOBILE */}
      {activeTab === "month" && (
        <div className="p-3.5 space-y-4">
          <div className="bg-[var(--card-bg)] p-3.5 rounded-2xl border border-[var(--border)] shadow-xs">
            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const d = new Date(monthCalendarData.y, monthCalendarData.m - 1, 1);
                  setMonthDate(d);
                  loadMonthData(d);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition active-press"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <h2 className="text-sm font-bold text-gray-900 capitalize flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                {monthCalendarData.monthName}
              </h2>

              <button
                onClick={() => {
                  const d = new Date(monthCalendarData.y, monthCalendarData.m + 1, 1);
                  setMonthDate(d);
                  loadMonthData(d);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition active-press"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* En-tête des jours */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <span key={i} className="text-[11px] font-bold text-gray-400">
                  {d}
                </span>
              ))}
            </div>

            {/* Grille mensuelle tactile */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: monthCalendarData.cellsCount }).map((_, i) => {
                const dayNum = i - monthCalendarData.firstDayIndex + 1;
                const isCurrentMonthDay = dayNum >= 1 && dayNum <= monthCalendarData.totalDays;

                if (!isCurrentMonthDay) {
                  return <div key={`empty-${i}`} className="h-12 opacity-0" />;
                }

                const dKey = `${monthCalendarData.y}-${String(monthCalendarData.m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const isToday = dKey === todayKey;
                const userDay = presencesMap[dKey]?.[currentUser.id] || { am: "NONE", pm: "NONE" };
                const breakdown = getDayPresenceBreakdown(dKey);

                return (
                  <button
                    key={dKey}
                    type="button"
                    onClick={() => setDetailDateKey(dKey)}
                    className={`h-13 rounded-xl p-1 flex flex-col items-center justify-between border transition active-press ${
                      isToday
                        ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold leading-none ${
                        isToday ? "text-blue-600" : "text-gray-800"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Pastille de mon statut */}
                    <div className="flex items-center gap-0.5 my-0.5">
                      {userDay.am === "OFFICE" || userDay.pm === "OFFICE" ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Bureau" />
                      ) : userDay.am === "REMOTE" || userDay.pm === "REMOTE" ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-500" title="Télétravail" />
                      ) : userDay.am === "ABSENT" || userDay.pm === "ABSENT" ? (
                        <span className="w-2 h-2 rounded-full bg-rose-500" title="Absent" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                      )}
                    </div>

                    {/* Compteur bureau collègues */}
                    <span className="text-[9px] font-semibold text-gray-500 leading-none">
                      {breakdown.atOffice.length > 0 ? `🏢${breakdown.atOffice.length}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Légende rapide */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Bureau
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Télétravail
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OPTIONS & APPLICATION */}
      {activeTab === "settings" && (
        <div className="p-3.5 space-y-4">
          {/* Section PWA App Download */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Installer l&apos;application</h3>
                <p className="text-xs text-blue-100">
                  Accès direct sans passer par le store d&apos;applications
                </p>
              </div>
            </div>

            <p className="text-xs text-blue-50 leading-relaxed">
              Installez l&apos;application directement sur l&apos;écran d&apos;accueil de votre téléphone pour
              accéder à votre planning en un geste et sans barre de navigateur.
            </p>

            <button
              onClick={() => setShowPwaInstallModal(true)}
              className="w-full py-2.5 bg-white text-blue-700 font-bold text-xs rounded-xl shadow-sm hover:bg-blue-50 active-press transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Voir comment installer l&apos;app</span>
            </button>
          </div>

          {/* Admin Team Switcher */}
          {currentUser.role === "ADMIN" && allTeams && allTeams.length > 0 && (
            <div className="bg-[var(--card-bg)] p-3.5 rounded-2xl border border-[var(--border)] shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                Administration : Changer d&apos;équipe
              </h3>
              <select
                value={selectedTeamId || ""}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  loadMonthData(monthDate, e.target.value);
                  showToast("Équipe changée");
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Switch Desktop Mode */}
          {onSwitchToDesktop && (
            <div className="bg-[var(--card-bg)] p-3.5 rounded-2xl border border-[var(--border)] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-900">Affichage Bureau (Grille)</h3>
                <p className="text-[11px] text-gray-500">
                  Afficher la grille mensuelle complète sur écran large
                </p>
              </div>
              <button
                onClick={onSwitchToDesktop}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl active-press transition"
              >
                Basculer
              </button>
            </div>
          )}

          {/* Profile & Info */}
          <div className="bg-[var(--card-bg)] p-3.5 rounded-2xl border border-[var(--border)] shadow-xs text-xs text-gray-600 space-y-2">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-400">Utilisateur</span>
              <span className="font-semibold text-gray-900">
                {currentUser.firstName} {currentUser.lastName}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-400">Email</span>
              <span className="font-semibold text-gray-900">{currentUser.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-400">Rôle</span>
              <span className="font-semibold text-gray-900">
                {currentUser.role === "ADMIN" ? "Administrateur" : "Membre"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Version PWA</span>
              <span className="font-semibold text-blue-600">v1.2.0 (Mobile Fast)</span>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM DRAWER / MODAL: SEMAINE TYPE (PRESETS EXPRESS) */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-200"
            role="dialog"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Modèles de Semaine</h3>
                  <p className="text-[11px] text-gray-500">
                    Appliquez une semaine type en 1 clic
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPresetModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 my-3">
              <button
                onClick={() => handleApplyPreset("office_all")}
                className="w-full p-3 text-left rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 transition active-press flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Toute la semaine au bureau</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Lundi au Vendredi (5 jours Bureau)
                  </div>
                </div>
                <Check className="w-4 h-4 text-emerald-600" />
              </button>

              <button
                onClick={() => handleApplyPreset("hybrid_3_2")}
                className="w-full p-3 text-left rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 transition active-press flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-blue-700" />
                    <span>Hybride (3j Bureau / 2j TT)</span>
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    Lun-Mer Bureau, Jeu-Ven Télétravail
                  </div>
                </div>
                <Check className="w-4 h-4 text-blue-600" />
              </button>

              <button
                onClick={() => handleApplyPreset("hybrid_2_3")}
                className="w-full p-3 text-left rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 transition active-press flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-700" />
                    <span>Hybride (2j Bureau / 3j TT)</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 mt-0.5">
                    Mar & Jeu Bureau, Lun-Mer-Ven Télétravail
                  </div>
                </div>
                <Check className="w-4 h-4 text-indigo-600" />
              </button>

              <button
                onClick={() => handleApplyPreset("remote_all")}
                className="w-full p-3 text-left rounded-2xl bg-indigo-50/60 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 transition active-press flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-indigo-700" />
                    <span>100% Télétravail</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 mt-0.5">
                    Lundi au Vendredi à la maison
                  </div>
                </div>
                <Check className="w-4 h-4 text-indigo-600" />
              </button>

              <button
                onClick={() => handleApplyPreset("clear_all")}
                className="w-full p-2.5 text-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition active-press"
              >
                Réinitialiser toute la semaine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET / MODAL: DÉTAIL D'UN JOUR DEPUIS LE MOIS */}
      {detailDateKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-200"
            role="dialog"
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 capitalize">
                  {new Intl.DateTimeFormat("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(detailDateKey + "T12:00:00"))}
                </h3>
                <p className="text-[11px] text-gray-500">Réserver ou voir les présences</p>
              </div>
              <button
                onClick={() => setDetailDateKey(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick set for this day */}
            <div className="grid grid-cols-3 gap-2 my-3">
              <button
                type="button"
                onClick={() => {
                  handleSetDayStatus(detailDateKey, "OFFICE", "all");
                  setDetailDateKey(null);
                }}
                className="py-2.5 px-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex flex-col items-center gap-1 active-press"
              >
                <Building2 className="w-4 h-4" />
                <span>Bureau</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSetDayStatus(detailDateKey, "REMOTE", "all");
                  setDetailDateKey(null);
                }}
                className="py-2.5 px-2 bg-indigo-50 text-indigo-800 border border-indigo-300 rounded-xl font-bold text-xs flex flex-col items-center gap-1 active-press"
              >
                <Home className="w-4 h-4" />
                <span>Télétravail</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSetDayStatus(detailDateKey, "ABSENT", "all");
                  setDetailDateKey(null);
                }}
                className="py-2.5 px-2 bg-rose-50 text-rose-800 border border-rose-300 rounded-xl font-bold text-xs flex flex-col items-center gap-1 active-press"
              >
                <Palmtree className="w-4 h-4" />
                <span>Absent</span>
              </button>
            </div>

            {/* Collègues ce jour */}
            <div className="pt-3 border-t border-gray-100 text-xs">
              <div className="font-semibold text-gray-800 mb-1.5">
                Collègues au bureau ce jour :
              </div>
              {(() => {
                const b = getDayPresenceBreakdown(detailDateKey);
                if (b.atOffice.length === 0) {
                  return <p className="text-gray-400 italic">Aucun collègue au bureau.</p>;
                }
                return (
                  <div className="flex flex-wrap gap-1">
                    {b.atOffice.map(({ member }) => (
                      <span
                        key={member.id}
                        className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-md text-[11px]"
                      >
                        {member.firstName} {member.lastName}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Modal */}
      <InstallPwaPrompt
        forceOpen={showPwaInstallModal}
        onClose={() => setShowPwaInstallModal(false)}
        showFloatingBanner={false}
      />

      {/* Floating Install Prompt Banner (Visible on first visit if not installed) */}
      <InstallPwaPrompt showFloatingBanner={true} />

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--card-bg)]/95 backdrop-blur-md border-t border-[var(--border)] shadow-lg pb-safe"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 h-16">
          {/* TAB 1: RÉSERVER */}
          <button
            onClick={() => setActiveTab("reserve")}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "reserve"
                ? "text-blue-600 font-bold"
                : "text-gray-400 hover:text-gray-600 font-medium"
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-[10px]">Réserver</span>
          </button>

          {/* TAB 2: MON ÉQUIPE */}
          <button
            onClick={() => setActiveTab("team")}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "team"
                ? "text-blue-600 font-bold"
                : "text-gray-400 hover:text-gray-600 font-medium"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Équipe</span>
          </button>

          {/* TAB 3: CALENDRIER MOIS */}
          <button
            onClick={() => setActiveTab("month")}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "month"
                ? "text-blue-600 font-bold"
                : "text-gray-400 hover:text-gray-600 font-medium"
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px]">Mois</span>
          </button>

          {/* TAB 4: OPTIONS & APP */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "settings"
                ? "text-blue-600 font-bold"
                : "text-gray-400 hover:text-gray-600 font-medium"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">Options</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
