"use client";

import type { CalendarIndexEntry } from "@/services/calendar";

interface Props {
  calendars: CalendarIndexEntry[];
  selectedId: string | null;
  onSelect: (c: CalendarIndexEntry) => void;
}

export default function CalendarList({
  calendars,
  selectedId,
  onSelect,
}: Props) {
  return (
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
              onClick={() => onSelect(c)}
              className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                selectedId === c.id ? "bg-blue-50 dark:bg-blue-900/30" : ""
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
  );
}
