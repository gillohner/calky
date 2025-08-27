"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Loader2,
  FileText,
  RefreshCw,
  MoreVertical,
  Trash2,
  Pencil,
} from "lucide-react";
import { logout } from "@/services/pubky";
import Navigation from "@/components/Navigation";
import LoginModal from "@/components/LoginModal";
import Footer from "../components/Footer";
import { useSession } from "@/contexts/SessionContext";
import {
  addEvent,
  deleteCalendar,
  deleteEvent,
  createCalendar,
  getCalendarIcs,
  getIndex,
  listEvents,
  updateCalendarProps,
  type CalendarIndexEntry,
  type NewEventInput,
} from "@/services/calendar";
import { HexColorPicker } from "react-colorful";

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
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Calendar edit mode and menu
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#0ea5e9");
  const [editTz, setEditTz] = useState("UTC");
  const [menuOpen, setMenuOpen] = useState(false);

  // ICS UI
  const [showIcs, setShowIcs] = useState(false);

  // New event form
  const [showEventModal, setShowEventModal] = useState(false);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  // Derived events from ICS
  const events = useMemo(() => listEvents(ics), [ics]);

  // Timezone options
  const tzOptions = useMemo(() => {
    // @ts-ignore
    if (typeof Intl !== "undefined" && Intl.supportedValuesOf) {
      // @ts-ignore
      return Intl.supportedValuesOf("timeZone") as string[];
    }
    return [
      "UTC",
      "Europe/Paris",
      "Europe/Berlin",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Tokyo",
    ];
  }, []);

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
      setShowCalendarModal(false);
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

  async function onDeleteCalendar() {
    if (!session || !selected) return;
    if (!confirm("Delete this calendar? This cannot be undone.")) return;
    try {
      setLoading(true);
      await deleteCalendar(session, selected.id);
      setCalendars((prev) => prev.filter((c) => c.id !== selected.id));
      setSelected(null);
      setIcs("\n");
      setView("list");
    } catch (e: any) {
      setError(e?.message || "Failed to delete calendar");
    } finally {
      setLoading(false);
      setMenuOpen(false);
    }
  }

  function beginEditCalendar() {
    if (!selected) return;
    setEditName(selected.displayName);
    setEditColor(selected.color || "#0ea5e9");
    setEditTz(timezone);
    setIsEditingCalendar(true);
    setMenuOpen(false);
  }

  async function saveCalendarEdits() {
    if (!session || !selected) return;
    try {
      setLoading(true);
      const next = await updateCalendarProps(session, selected.id, {
        displayName: editName,
        color: editColor,
        timezone: editTz,
      });
      setCalendars((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, displayName: next.displayName, color: next.color }
            : c
        )
      );
      setSelected((s) =>
        s ? { ...s, displayName: next.displayName, color: next.color } : s
      );
      setIsEditingCalendar(false);
    } catch (e: any) {
      setError(e?.message || "Failed to update calendar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEvent(uid: string) {
    if (!session || !selected) return;
    try {
      setLoading(true);
      await deleteEvent(session, selected.id, uid);
      const { ics } = await getCalendarIcs(session, selected.id);
      setIcs(ics || "");
    } catch (e: any) {
      setError(e?.message || "Failed to delete event");
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
              onClick={() => setShowCalendarModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2 h-10"
            >
              <Plus className="w-4 h-4" /> New Calendar
            </button>
            <button
              onClick={() => session && bootstrap(session)}
              className="px-4 py-2 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
          </div>
        </div>
        {/* Inline creation removed; handled via modal */}

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
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowEventModal(true)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2 h-10"
                        >
                          <Plus className="w-4 h-4" /> Add Event
                        </button>
                        <button
                          onClick={() => setMenuOpen((v) => !v)}
                          className="px-3 py-2 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                          aria-haspopup="menu"
                          aria-expanded={menuOpen}
                          title="More"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      {menuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                          <button
                            onClick={beginEditCalendar}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                          >
                            <Pencil className="w-4 h-4" /> Edit calendar
                          </button>
                          <button
                            onClick={onDeleteCalendar}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" /> Delete calendar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Events list as cards */}
                  <div className="space-y-3 mb-4">
                    {events.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        No events yet
                      </div>
                    )}
                    {events.map((ev) => (
                      <div
                        key={ev.uid}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900 flex items-start justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {ev.summary}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {ev.start.toLocaleString()} →{" "}
                            {ev.end.toLocaleString()}
                          </div>
                          {(ev.location || ev.description) && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {ev.location && <span>📍 {ev.location} </span>}
                              {ev.description && (
                                <span>— {ev.description}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(ev.uid)}
                          className="px-2 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 text-sm"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Collapsible raw ICS */}
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowIcs((v) => !v)}
                      aria-expanded={showIcs}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 transition-colors ${
                        showIcs ? "rounded-t-lg" : "rounded-lg"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> <span>Raw ICS</span>
                      </span>

                      {/* Standard chevron icon (no extra import required) */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`w-4 h-4 transform transition-transform duration-150 ${
                          showIcs ? "rotate-180" : "rotate-0"
                        }`}
                        aria-hidden
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {showIcs && (
                      <pre className="p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-auto max-h-96 bg-white dark:bg-slate-800">
                        {loading ? "Loading…" : ics}
                      </pre>
                    )}
                  </div>

                  {/* Inline calendar edit controls */}
                  {isEditingCalendar && (
                    <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                      <div className="grid md:grid-cols-4 gap-3 items-center">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Display name"
                          className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                        />
                        <div className="flex items-center gap-3">
                          <HexColorPicker
                            color={editColor}
                            onChange={setEditColor}
                          />
                          <input
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-32 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <select
                          value={editTz}
                          onChange={(e) => setEditTz(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                        >
                          {tzOptions.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditingCalendar(false)}
                            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveCalendarEdits}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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

      {/* New Calendar modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              New Calendar
            </h3>
            <div className="space-y-4">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              />
              <div>
                <HexColorPicker color={color} onChange={setColor} />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-32 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                  />
                  <span
                    className="inline-block w-6 h-6 rounded"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              >
                {tzOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onCreateCalendar}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                Create Calendar
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

      <Footer />
    </div>
  );
}
