'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { logout } from '@/services/pubky'
import Navigation from '@/components/Navigation'
import LoginModal from '@/components/LoginModal'
import { useSession } from '@/contexts/SessionContext'

export default function Dashboard() {
  const { session, setSession } = useSession()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const handleLogin = (newSession: any) => {
    setSession(newSession)
    setIsLoginModalOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    setSession(null)
    setIsLoginModalOpen(true)
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
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navigation 
        onLogout={handleLogout} 
        currentPage="dashboard" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Welcome to your Pubky dashboard
          </p>
        </div>

        {/* Encouragement message */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Zap className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Ready to create something incredible?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                Your Pubky environment is configured and functional.
              </p>
              <p className="text-xl font-medium text-blue-600 dark:text-blue-400">
                All that's left is to code your application! 🚀
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              © 2024 Pubky Template. Built with Next.js and Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}