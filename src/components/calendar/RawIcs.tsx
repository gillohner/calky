"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

interface Props {
  ics: string;
  loading: boolean;
}

export default function RawIcs({ ics, loading }: Props) {
  const [showIcs, setShowIcs] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowIcs((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 text-left bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 ${
          showIcs ? "rounded-t-lg" : "rounded-lg"
        }`}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" /> Raw ICS
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 transform transition-transform ${
            showIcs ? "rotate-180" : "rotate-0"
          }`}
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
  );
}
