"use client";

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            © 2025 Calky. Built with Next.js and Tailwind CSS.
          </p>
          <div className="gap-3 flex justify-center text-gray-600 dark:text-gray-400">
            <a
              href="https://github.com/gillohner/calky"
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
      </div>
    </footer>
  );
}
