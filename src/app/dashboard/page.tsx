// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Loader2,
  FileText,
  RefreshCw,
} from "lucide-react";
import { logout } from "@/services/pubky";
import Navigation from "@/components/Navigation";
import LoginModal from "@/components/LoginModal";
import { useSession } from "@/contexts/SessionContext";
import {
  addEvent,
  createCalendar,
  getCalendarIcs,
  getIndex,
  type CalendarIndexEntry,
  type NewEventInput,
} from "@/services/calendar";

type ViewState = "list" | "detail";

export default function Dashboard() {
  const { session, setSession } = useSession();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calendars, setCalendars] = useState<CalendarIndexEntry[]>([]);
  const [selected, setSelected] = useState<CalendarIndexEntry | null>(null);
  const [ics, setIcs] = useState<string>("");
  const [view, setView] = useState<ViewState>("list");

  // New calendar form
  const [displayName, setDisplayName] = useState("Personal");
  const [color, setColor] = useState("#0ea5e9");
  const [timezone, setTimezone] = useState("UTC");

  // New event form
  const [showEventModal, setShowEventModal] = useState(false);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const handleLogin = (newSession: any) => {
    setSession(newSession);
    setIsLoginModalOpen(false);
    void bootstrap(newSession);
  };

  const handleLogout = async () => {
    await logout();
    setSession(null);
    setIsLoginModalOpen(true);
  };

  useEffect(() => {
    if (session) void bootstrap(session);
  }, [session]);

  async function bootstrap(s: any) {
    setLoading(true);
    setError(null);
    try {
      const idx = await getIndex(s);
      setCalendars(idx.calendars);
      setSelected(idx.calendars[0] || null);
      if (idx.calendars[0]) {
        const id = idx.calendars[0].id;
        const { ics } = await getCalendarIcs(s, id);
        setIcs(ics || "");
        setView("detail");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load calendars");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateCalendar() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createCalendar(session, {
        displayName,
        color,
        timezone,
      });
      const entry: CalendarIndexEntry = {
        id: result.id,
        href: `/pub/calky/cal/${result.id}/`,
        displayName,
        color,
        readOnly: false,
      };
      setCalendars((prev) => [entry, ...prev]);
      setSelected(entry);
      setIcs(result.ics);
      setView("detail");
    } catch (e: any) {
      setError(e?.message || "Failed to create calendar");
    } finally {
      setLoading(false);
    }
  }

  async function onSelectCalendar(c: CalendarIndexEntry) {
    if (!session) return;
    setSelected(c);
    setLoading(true);
    setError(null);
    try {
      const { ics } = await getCalendarIcs(session, c.id);
      setIcs(ics || "");
      setView("detail");
    } catch (e: any) {
      setError(e?.message || "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateEvent() {
    if (!session || !selected) return;
    // Basic validation
    if (!summary || !start || !end) {
      setError("Please fill summary, start and end");
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!(startDate instanceof Date) || isNaN(startDate as unknown as number)) {
      setError("Invalid start date");
      return;
    }
    if (!(endDate instanceof Date) || isNaN(endDate as unknown as number)) {
      setError("Invalid end date");
      return;
    }
    if (endDate <= startDate) {
      setError("End must be after start");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const input: NewEventInput = {
        summary,
        description,
        location,
        start: startDate,
        end: endDate,
      };
      await addEvent(session, selected.id, input);
      const { ics } = await getCalendarIcs(session, selected.id);
      setIcs(ics || "");
      setShowEventModal(false);
      // reset form
      setSummary("");
      setDescription("");
      setLocation("");
      setStart("");
      setEnd("");
    } catch (e: any) {
      setError(e?.message || "Failed to add event");
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <Navigation currentPage="dashboard" />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Login Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please log in to access the dashboard
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
            >
              Connect
            </button>
          </div>
        </div>
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navigation onLogout={handleLogout} currentPage="dashboard" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-blue-600" /> Calendars
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateCalendar}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Calendar
            </button>
            <button
              onClick={() => session && bootstrap(session)}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New calendar inline form */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#0ea5e9"
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="IANA timezone (e.g. Europe/Paris)"
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={onCreateCalendar}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Calendar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calendars list */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {calendars.length === 0 && (
                  <li className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                    No calendars yet
                  </li>
                )}
                {calendars.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => onSelectCalendar(c)}
                      className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                        selected?.id === c.id
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: c.color || "#64748b" }}
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {c.displayName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {c.id.slice(0, 8)}…
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Calendar detail */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
              {!selected ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Select or create a calendar
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: selected.color || "#64748b" }}
                      />
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selected.displayName}
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowEventModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Event
                    </button>
                  </div>

                  {/* Simple preview of ICS as text for now */}
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                      <FileText className="w-4 h-4" /> calendar.ics
                    </div>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-auto max-h-96">
                      {loading ? "Loading…" : ics}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              New Event
            </h3>
            <div className="space-y-3">
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summary"
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location"
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                />
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            {error && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onCreateEvent}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
