'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, Server, User } from 'lucide-react'
import { logout, initPubkyClient } from '@/services/pubky'
import LoginModal from '@/components/LoginModal'
import Navigation from '@/components/Navigation'
import { useSession } from '@/contexts/SessionContext'

export default function Profile() {
  const { session, setSession, isLoading } = useSession()
  const [copied, setCopied] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [homeserver, setHomeserver] = useState<any>(null)
  const [homeserverLoading, setHomeserverLoading] = useState(false)
  const [homeserverError, setHomeserverError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      getHomeserverFor(session)
    }
  }, [session])

  const getHomeserverFor = async (session: any) => {
    if (!session || !session.pubkey) {
      setHomeserverError('Invalid session or missing pubkey')
      return
    }

    setHomeserverLoading(true)
    setHomeserverError(null)
    
    try {
       const clientInstance = await initPubkyClient()
       const { PublicKey } = await import('@synonymdev/pubky')
       const userPk = PublicKey.from(session.pubkey)
       const homeserver = await clientInstance.getHomeserver(userPk)
      
      if (!homeserver) {
        throw new Error('No homeserver found for this pubkey')
      }

      let addresses = []
      let port = null

      try {
        if (typeof homeserver.getAddresses === 'function') {
          addresses = await homeserver.getAddresses()
        }
        if (!addresses.length && typeof homeserver.addr === 'string') {
          addresses = [homeserver.addr]
        }
        if (typeof homeserver.port === 'number') {
          port = homeserver.port
        }
        if (!port && typeof homeserver.getPort === 'function') {
          port = await homeserver.getPort()
        }
      } catch (e) {
        console.warn('Failed to probe homeserver address:', e)
      }

      setHomeserver({
        key: homeserver.z32(),
        addresses,
        port
      })
    } catch (error) {
      console.error('❌ Error resolving homeserver:', error)
      setHomeserverError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setHomeserverLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleLogin = (newSession: any) => {
    setSession(newSession)
    setIsLoginModalOpen(false)
    getHomeserverFor(newSession)
  }

  const handleLogout = () => {
    logout()
    setSession(null)
    setHomeserver(null)
    setHomeserverError(null)
    setHomeserverLoading(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navigation 
        onLogout={handleLogout} 
        currentPage="profile" 
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Loading...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Checking your session
            </p>
          </div>
        ) : !session ? (
          <div className="text-center">
            <User className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Not connected
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to connect with Pubky Ring to view your profile.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
                  <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    My Profile
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your Pubky account information
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Public Key (Pubkey)
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border dark:border-slate-600">
                      <code className="text-sm text-gray-900 dark:text-gray-100 break-all">
                        {session.pubkey}
                      </code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(session.pubkey)}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Copy pubkey"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Homeserver
                  </label>
                  {homeserverLoading ? (
                    <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border dark:border-slate-600">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Resolving homeserver...</span>
                      </div>
                    </div>
                  ) : homeserverError ? (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600 dark:text-red-400">{homeserverError}</span>
                      </div>
                    </div>
                  ) : homeserver ? (
                    <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border dark:border-slate-600">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Server className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Homeserver key:</span>
                        </div>
                        <code className="text-sm text-gray-900 dark:text-gray-100 break-all block">
                          {homeserver.key}
                        </code>
                        {homeserver.addresses && homeserver.addresses.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Addresses:</span>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                              {homeserver.addresses.map((addr: string, index: number) => (
                                <li key={index}>• {addr}{homeserver.port ? `:${homeserver.port}` : ''}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border dark:border-slate-600">
                      <span className="text-sm text-gray-600 dark:text-gray-400">No homeserver found</span>
                    </div>
                  )}
                </div>

                {session.capabilities && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Capabilities
                    </label>
                    <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border dark:border-slate-600">
                      <code className="text-sm text-gray-900 dark:text-gray-100">
                        {session.capabilities}
                      </code>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Connection Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      Connected via Pubky Ring
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}