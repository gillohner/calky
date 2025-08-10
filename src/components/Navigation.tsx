'use client'

import { User, Settings, Moon, Sun, Home, LayoutDashboard } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useSession } from '@/contexts/SessionContext'

interface NavigationProps {
  session?: any
  onLogout?: () => void
  onLoginClick?: () => void
  currentPage?: 'home' | 'profile' | 'settings' | 'dashboard'
}

export default function Navigation({ onLogout, onLoginClick, currentPage = 'home' }: NavigationProps) {
  const { theme, toggleTheme } = useTheme()
  const { session, isLoading } = useSession()

  const isCurrentPage = (page: string) => currentPage === page

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <a href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Pubky Template</span>
            </a>
          </div>
          
          <nav className="flex items-center space-x-4">

            
            {/* Home link for other pages */}
            {currentPage !== 'home' && (
              <a
                href="/"
                className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Home"
              >
                <Home className="w-5 h-5" />
              </a>
            )}
            
            {/* Dashboard link for logged in users */}
            {!isLoading && session && currentPage !== 'dashboard' && (
              <a
                href="/dashboard"
                className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Dashboard"
              >
                <LayoutDashboard className="w-5 h-5" />
              </a>
            )}
            
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {/* Settings link for logged in users */}
            {!isLoading && session && currentPage !== 'settings' && (
              <a
                href="/settings"
                className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </a>
            )}
            
            {/* User navigation */}
            {!isLoading && session && (
              <>
                <a
                  href="/profile"
                  className={`p-2 rounded-lg transition-colors ${
                    isCurrentPage('profile')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="My Profile"
                >
                  <User className="w-5 h-5" />
                </a>
                <a
                  href="/settings"
                  className={`p-2 rounded-lg transition-colors ${
                    isCurrentPage('settings')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </a>
              </>
            )}
            
            {/* User information and logout */}
            {!isLoading && session && onLogout ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                  {session.pubkey.slice(0, 8)}...{session.pubkey.slice(-8)}
                </span>
                <button
                  onClick={onLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              onLoginClick && (
                <button
                  onClick={onLoginClick}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  Login with Pubky Ring
                </button>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}