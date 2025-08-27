"use client";

export default function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <div className="flex flex-col items-center gap-2">
        <div>
          Built with <span className="font-semibold">Calky</span> · Public
          calendars live under{" "}
          <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800">
            /pub/calky
          </code>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-700 dark:hover:text-gray-200"
          >
            GitHub
          </a>
          <span>·</span>
          <a
            href="https://pubky.org/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-gray-700 dark:hover:text-gray-200"
          >
            Pubky
          </a>
        </div>
      </div>
    </footer>
  );
}
