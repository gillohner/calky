'use client'

import { useEffect, useState } from 'react'
import { Settings, User, Copy, Check, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react'
import { logout, initPubkyClient, checkAppFolderExists, createAppFolder, deleteAppFolder } from '@/services/pubky'
import LoginModal from '@/components/LoginModal'
import Navigation from '@/components/Navigation'
import { useSession } from '@/contexts/SessionContext'
import * as PubkyAppSpecs from 'pubky-app-specs'

export default function SettingsPage() {
  const { session, setSession } = useSession()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [clientStatus, setClientStatus] = useState<'loading' | 'initialized' | 'error'>('loading')
  const [pubkyClientStatus, setPubkyClientStatus] = useState<'loading' | 'initialized' | 'error'>('loading')
  const [appFolderExists, setAppFolderExists] = useState<boolean | null>(null)
  const [isTestingFolder, setIsTestingFolder] = useState(false)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [testResult, setTestResult] = useState<string>('')

  useEffect(() => {
    checkClientStatus()
  }, [])

  const checkClientStatus = async () => {
    try {
      // Check pubky-app-specs
      if (typeof PubkyAppSpecs.baseUriBuilder === 'function') {
        setClientStatus('initialized')
      } else {
        setClientStatus('error')
      }
      
      // Check Pubky client
      if (typeof window !== 'undefined') {
        const client = await initPubkyClient()
        if (client) {
          setPubkyClientStatus('initialized')
        } else {
          setPubkyClientStatus('error')
        }
      }
    } catch (error) {
      console.error('Error checking clients:', error)
      setClientStatus('error')
      setPubkyClientStatus('error')
    }
  }

  const testAppFolder = async () => {
    if (!session?.pubkey) {
      setTestResult('You must be connected to test the application folder')
      return
    }

    setIsTestingFolder(true)
    setTestResult('')
    setAppFolderExists(null)

    try {
      const result = await checkAppFolderExists(session)
      const appName = process.env.NEXT_PUBLIC_PUBKY_APP_NAME || 'pubky-nextjs-template'
      
      if (!result.success) {
        setAppFolderExists(false)
        setTestResult(`Error during test: ${result.error}`)
      } else if (result.exists) {
        setAppFolderExists(true)
        setTestResult(`The application folder "${appName}" exists.`)
      } else {
        setAppFolderExists(false)
        setTestResult(`The application folder "${appName}" does not exist.`)
      }
    } catch (error) {
      console.error('Error testing folder:', error)
      setAppFolderExists(false)
      setTestResult(`Error during test: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTestingFolder(false)
    }
  }

  const createFolder = async () => {
    if (!session) return
    
    setIsCreatingFolder(true)
    
    try {
      const result = await createAppFolder(session)
      
      if (result.success) {
        setTestResult('✅ Folder created successfully')
        // Re-test to confirm creation
        setTimeout(() => testAppFolder(), 1000)
      } else {
        setTestResult(`❌ Error during creation: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const deleteFolder = async () => {
    if (!session) return
    
    setIsDeletingFolder(true)
    
    try {
      const result = await deleteAppFolder(session)
      
      if (result.success) {
        setTestResult('✅ Folder deleted successfully')
        // Re-test to confirm deletion
        setTimeout(() => testAppFolder(), 1000)
      } else {
        setTestResult(`❌ Error during deletion: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeletingFolder(false)
    }
  }

  const handleLogin = (newSession: any) => {
    setSession(newSession)
    setIsLoginModalOpen(false)
  }

  const handleLogout = () => {
    logout()
    setSession(null)
    setAppFolderExists(null)
    setTestResult('')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Navigation 
        onLogout={handleLogout} 
        currentPage="settings" 
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mr-4">
                <Settings className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Pubky application configuration and tests
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Client Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Client Status
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {clientStatus === 'loading' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                    {clientStatus === 'initialized' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {clientStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="text-gray-600 dark:text-gray-400">
                      <strong>Pubky App Specs:</strong> {clientStatus === 'initialized' ? 'Initialized' :
                       clientStatus === 'error' ? 'Error' : 'Checking...'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {pubkyClientStatus === 'loading' && <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />}
                    {pubkyClientStatus === 'initialized' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {pubkyClientStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="text-gray-600 dark:text-gray-400">
                      <strong>Pubky Client:</strong> {pubkyClientStatus === 'initialized' ? 'Initialized' :
                       pubkyClientStatus === 'error' ? 'Error' : 'Checking...'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={checkClientStatus}
                  className="mt-2 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  Recheck
                </button>
              </div>

              {/* Application Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Application Configuration
                </h3>
                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Application name:</div>
                  <code className="text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded border">
                    {process.env.NEXT_PUBLIC_PUBKY_APP_NAME || 'pubky-nextjs-template'}
                  </code>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">💡</div>
                    <div className="text-blue-800 dark:text-blue-200 text-sm">
                      To modify the application name, add or modify the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">NEXT_PUBLIC_PUBKY_APP_NAME</code> variable in the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">.env.local</code> file at the root of your project.
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Folder Test */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Application Folder Test
                </h3>
                
                {!session ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      You must be connected with Pubky Ring to test the application folder.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex space-x-3">
                      <button
                        onClick={testAppFolder}
                        disabled={isTestingFolder}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isTestingFolder ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span>{isTestingFolder ? 'Testing...' : 'Test Folder'}</span>
                      </button>
                      
                      {appFolderExists === false && (
                        <button
                           onClick={createFolder}
                           disabled={isCreatingFolder}
                           className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                         >
                           {isCreatingFolder ? (
                             <RefreshCw className="h-4 w-4 animate-spin" />
                           ) : (
                             <CheckCircle className="h-4 w-4" />
                           )}
                           <span>{isCreatingFolder ? 'Creating...' : 'Create Folder'}</span>
                         </button>
                      )}
                       
                       {appFolderExists === true && (
                         <button
                           onClick={deleteFolder}
                           disabled={isDeletingFolder}
                           className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                         >
                           {isDeletingFolder ? (
                             <RefreshCw className="h-4 w-4 animate-spin" />
                           ) : (
                             <Trash2 className="h-4 w-4" />
                           )}
                           <span>{isDeletingFolder ? 'Deleting...' : 'Delete Folder'}</span>
                         </button>
                       )}
                    </div>

                    {testResult && (
                      <div className={`p-4 rounded-lg border ${
                        appFolderExists === true 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                          : appFolderExists === false
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {appFolderExists === true && <CheckCircle className="h-5 w-5" />}
                          {appFolderExists === false && <XCircle className="h-5 w-5" />}
                          <span className="text-sm">{testResult}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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