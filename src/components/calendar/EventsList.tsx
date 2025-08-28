"use client";

import type { CalendarEvent } from "@/services/calendar";
import { Pencil, Trash2 } from "lucide-react";

interface Props {
  events: CalendarEvent[];
  onEdit: (ev: CalendarEvent) => void;
  onDelete: (uid: string) => void;
}

export default function EventsList({ events, onEdit, onDelete }: Props) {
  return (
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
              {ev.start.toLocaleString()} → {ev.end.toLocaleString()}
            </div>
            {(ev.location || ev.description) && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {ev.location && <span>📍 {ev.location} </span>}
                {ev.description && <span>— {ev.description}</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(ev)}
              className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(ev.uid)}
              className="px-2 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 text-sm"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
