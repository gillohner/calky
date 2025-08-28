"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarIndexEntry } from "@/services/calendar";
import { MoreVertical, Pencil, Trash2, Plus } from "lucide-react";

interface Props {
  selected: CalendarIndexEntry;
  onNewEvent: () => void;
  onEditCalendar: () => void;
  onDeleteCalendar: () => void;
}

export default function CalendarHeader({
  selected,
  onNewEvent,
  onEditCalendar,
  onDeleteCalendar,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuOpen) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
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
      <div className="flex items-center gap-2" ref={ref}>
        <button
          onClick={onNewEvent}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2 h-10"
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="px-3 py-2 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEditCalendar();
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 text-gray-700 dark:text-gray-200"
              >
                <Pencil className="w-4 h-4" /> Edit calendar
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteCalendar();
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" /> Delete calendar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
