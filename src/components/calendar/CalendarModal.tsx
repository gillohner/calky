"use client";

import { HexColorPicker } from "react-colorful";

interface Props {
  isOpen: boolean;
  editMode: boolean;
  name: string;
  setName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  tz: string;
  setTz: (v: string) => void;
  tzOptions: string[];
  onCancel: () => void;
  onSubmit: () => void;
}

export default function CalendarModal({
  isOpen,
  editMode,
  name,
  setName,
  color,
  setColor,
  tz,
  setTz,
  tzOptions,
  onCancel,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editMode ? "Edit Calendar" : "New Calendar"}
        </h3>
        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
          >
            {tzOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
          >
            {editMode ? "Save Changes" : "Create Calendar"}
          </button>
        </div>
      </div>
    </div>
  );
}
