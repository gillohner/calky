"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, Plus, RefreshCw } from "lucide-react";
import { logout } from "@/services/pubky";
import Navigation from "@/components/Navigation";
import LoginModal from "@/components/LoginModal";
import Footer from "@/components/Footer";
import { useSession } from "@/contexts/SessionContext";
import {
  addEvent,
  deleteCalendar,
  deleteEvent,
  updateEvent,
  createCalendar,
  getCalendarIcs,
  getIndex,
  listEvents,
  updateCalendarProps,
  type CalendarIndexEntry,
  type NewEventInput,
} from "@/services/calendar";
import CalendarList from "@/components/calendar/CalendarList";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import EventsList from "@/components/calendar/EventsList";
import RawIcs from "@/components/calendar/RawIcs";
import EventModal from "@/components/calendar/EventModal";
import CalendarModal from "@/components/calendar/CalendarModal";

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
  const [calendarEditMode, setCalendarEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#0ea5e9");
  const [editTz, setEditTz] = useState("UTC");

  // ICS UI
  const [showIcs, setShowIcs] = useState(false);

  // Event modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventEditMode, setEventEditMode] = useState(false);
  const [editingEventUid, setEditingEventUid] = useState<string | null>(null);

  // New/Edit event form
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

  async function onSelectCalendar(c: CalendarIndexEntry) {
    setSelected(c);
    const { ics } = await getCalendarIcs(session, c.id);
    setIcs(ics || "");
    setView("detail");
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

  async function onEditCalendar() {
    if (!session || !selected) return;
    setLoading(true);
    setError(null);
    try {
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
      setCalendarEditMode(false);
      setShowCalendarModal(false); // close modal to avoid flipping into create mode
    } catch (e: any) {
      setError(e?.message || "Failed to update calendar");
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteCalendar() {
    if (!session || !selected) return;
    if (!confirm("Delete this calendar? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteCalendar(session, selected.id);
      setCalendars((prev) => prev.filter((c) => c.id !== selected.id));
      setSelected(null);
      setIcs("\n");
      setView("list");
    } catch (e: any) {
      setError(e?.message || "Failed to delete calendar");
    } finally {
      setLoading(false);
    }
  }

  function beginCalendarEdit() {
    if (!selected) return;
    setEditName(selected.displayName);
    setEditColor(selected.color || "#0ea5e9");
    setEditTz(timezone);
    setCalendarEditMode(true);
    setShowCalendarModal(true); // ensure modal opens
  }

  // Event CRUD

  function openNewEventModal() {
    setEventEditMode(false);
    setEditingEventUid(null);
    setSummary("");
    setDescription("");
    setLocation("");
    setStart("");
    setEnd("");
    setShowEventModal(true);
  }

  function openEditEventModal(ev: (typeof events)[0]) {
    setEventEditMode(true);
    setEditingEventUid(ev.uid);
    setSummary(ev.summary);
    setDescription(ev.description || "");
    setLocation(ev.location || "");
    setStart(ev.start.toISOString().slice(0, 16));
    setEnd(ev.end.toISOString().slice(0, 16));
    setShowEventModal(true);
  }

  async function onCreateOrEditEvent() {
    if (!session || !selected) return;
    if (!summary || !start || !end) {
      setError("Please fill summary, start and end");
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
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
      if (eventEditMode && editingEventUid) {
        await updateEvent(session, selected.id, editingEventUid, input);
      } else {
        await addEvent(session, selected.id, input);
      }
      const { ics } = await getCalendarIcs(session, selected.id);
      setIcs(ics || "");
      setShowEventModal(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save event");
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteEvent(uid: string) {
    if (!session || !selected) return;
    setLoading(true);
    try {
      await deleteEvent(session, selected.id, uid);
      const { ics } = await getCalendarIcs(session, selected.id);
      setIcs(ics || "");
    } catch (e: any) {
      setError(e?.message || "Failed to delete event");
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
              onClick={() => {
                setCalendarEditMode(false); // ensure create mode
                setShowCalendarModal(true);
              }}
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

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calendars list */}
          <div className="md:col-span-1">
            {/* replaced list with component */}
            <CalendarList
              calendars={calendars}
              selectedId={selected?.id || null}
              onSelect={onSelectCalendar}
            />
          </div>

          {/* Calendar detail */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
              {!selected ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Select or create a calendar
                </div>
              ) : (
                <>
                  {/* Calendar header */}
                  <CalendarHeader
                    selected={selected}
                    onNewEvent={openNewEventModal}
                    onEditCalendar={beginCalendarEdit}
                    onDeleteCalendar={onDeleteCalendar}
                  />

                  {/* Events list */}
                  <EventsList
                    events={events}
                    onEdit={openEditEventModal}
                    onDelete={onDeleteEvent}
                  />

                  {/* Raw ICS toggler */}
                  <RawIcs ics={ics} loading={loading} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        editMode={eventEditMode}
        summary={summary}
        setSummary={setSummary}
        location={location}
        setLocation={setLocation}
        description={description}
        setDescription={setDescription}
        start={start}
        setStart={setStart}
        end={end}
        setEnd={setEnd}
        error={error || undefined}
        loading={loading}
        onCancel={() => setShowEventModal(false)}
        onSubmit={onCreateOrEditEvent}
      />

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={showCalendarModal}
        editMode={calendarEditMode}
        name={calendarEditMode ? editName : displayName}
        setName={calendarEditMode ? setEditName : setDisplayName}
        color={calendarEditMode ? editColor : color}
        setColor={calendarEditMode ? setEditColor : setColor}
        tz={calendarEditMode ? editTz : timezone}
        setTz={calendarEditMode ? setEditTz : setTimezone}
        tzOptions={tzOptions}
        onCancel={() => {
          setShowCalendarModal(false);
          setCalendarEditMode(false);
        }}
        onSubmit={calendarEditMode ? onEditCalendar : onCreateCalendar}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      <Footer />
    </div>
  );
}
