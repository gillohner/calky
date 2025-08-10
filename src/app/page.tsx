'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Users, Zap, Shield, ArrowRight, Menu, X } from 'lucide-react'
import { formatDate, truncateText } from '@/lib/utils'
import LoginModal from '@/components/LoginModal'
import Navigation from '@/components/Navigation'
import { logout } from '@/services/pubky'
import { useSession } from '@/contexts/SessionContext'

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { session, setSession } = useSession()
  const router = useRouter()

  const handleLogin = (newSession: any) => {
    setSession(newSession)
    setIsLoginModalOpen(false)
    router.push('/dashboard')
  }

  const handleLogout = async () => {
    await logout()
    setSession(null)
  }
  const features = [
    {
      icon: Shield,
      title: "Identité Décentralisée",
      description: "Utilisez des clés cryptographiques comme identité, sans dépendre d'autorités centrales",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Zap,
      title: "Résistant à la Censure",
      description: "Vos données restent accessibles grâce aux homeservers et au protocole PKARR",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Users,
      title: "Contrôle Utilisateur",
      description: "Vous possédez et contrôlez vos données, avec une sortie crédible garantie",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Star,
      title: "Open Source",
      description: "Template Next.js complet avec Tailwind CSS et intégration Pubky prête à l'emploi",
      color: "from-green-500 to-emerald-500"
    }
  ]

  const stats = [
    { label: "Clients", value: "1,200+", icon: Users },
    { label: "Projects", value: "50+", icon: Star },
    { label: "Countries", value: "25+", icon: Shield },
    { label: "Uptime", value: "99.9%", icon: Zap }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-slate-900 transition-colors">
      <Navigation 
        onLogout={handleLogout} 
        currentPage="home" 
        onLoginClick={() => setIsLoginModalOpen(true)}
      />

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Next.js Template for
            <span className="text-blue-600"> Pubky Core</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            A complete Next.js template with Tailwind CSS and Pubky integration for building decentralized applications. 
            Key-based identity, censorship resistance, and user control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Get Started with Pubky
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <a 
              href="https://docs.pubky.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors inline-block text-center"
            >
              Pubky Documentation
            </a>
          </div>
        </div>
      </section>

      {/* About Pubky Section */}
      <section className="py-20 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">What is Pubky?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto">
               Pubky Core is an open-source protocol for a decentralized and user-controlled web. 
               It combines cryptographic key-based identity (PKARR), autonomous data storage (Homeservers) 
               and censorship resistance to create a truly free internet.
             </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your identity, your data, your rules</h3>
              <ul className="space-y-4 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <Shield className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Decentralized identity:</strong> Use cryptographic keys as identity, without depending on central authorities</span>
                </li>
                <li className="flex items-start">
                  <Zap className="h-6 w-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Credible exit:</strong> Your data remains portable and you keep control even if a server bans you</span>
                </li>
                <li className="flex items-start">
                  <Users className="h-6 w-6 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span><strong>Censorship resistance:</strong> Public Key Domains (PKDs) offer a decentralized alternative to traditional DNS</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8">
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">This template includes:</h4>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li>✅ Integrated Pubky authentication</li>
                <li>✅ Homeserver management</li>
                <li>✅ Modern UI with Tailwind CSS</li>
                <li>✅ TypeScript for type safety</li>
                <li>✅ Reusable components</li>
                <li>✅ Dark/light theme</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Pubky Core?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">The benefits of the decentralized web integrated into this template</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">PKARR</h3>
              <p className="text-gray-600 dark:text-gray-300">Decentralized identity and routing based on cryptographic keys.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Homeservers</h3>
              <p className="text-gray-600 dark:text-gray-300">Autonomous data storage with guaranteed credible exit.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-purple-100 dark:bg-purple-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Complete Template</h3>
              <p className="text-gray-600 dark:text-gray-300">Next.js, Tailwind CSS, authentication and integrated data management.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to build on Pubky?</h2>
          <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">Create your decentralized application with this ready-to-use template</p>
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-white dark:bg-slate-100 text-blue-600 dark:text-blue-700 px-8 py-3 rounded-md hover:bg-gray-100 dark:hover:bg-slate-200 transition-colors font-semibold"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-slate-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Zap className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-lg font-bold">Pubky Template</span>
              </div>
              <p className="text-gray-400 dark:text-gray-300">Next.js template for Pubky decentralized applications.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Pubky Core</h3>
              <ul className="space-y-2 text-gray-400 dark:text-gray-300">
                <li><a href="https://www.pubky.org" target="_blank" rel="noopener noreferrer" className="hover:text-white">Official Site</a></li>
                <li><a href="https://docs.pubky.org" target="_blank" rel="noopener noreferrer" className="hover:text-white">Documentation</a></li>
                <li><a href="https://github.com/pubky" target="_blank" rel="noopener noreferrer" className="hover:text-white">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Technologies</h3>
              <ul className="space-y-2 text-gray-400 dark:text-gray-300">
                <li><a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="hover:text-white">Next.js</a></li>
                <li><a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Tailwind CSS</a></li>
                <li><a href="https://www.typescriptlang.org" target="_blank" rel="noopener noreferrer" className="hover:text-white">TypeScript</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400 dark:text-gray-300">
                <li><a href="https://docs.pubky.org" target="_blank" rel="noopener noreferrer" className="hover:text-white">Getting Started</a></li>
                <li><a href="https://github.com/pubky" target="_blank" rel="noopener noreferrer" className="hover:text-white">Examples</a></li>
                <li><a href="https://www.pubky.org" target="_blank" rel="noopener noreferrer" className="hover:text-white">Community</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 dark:border-gray-700 mt-8 pt-8 text-center text-gray-400 dark:text-gray-300">
            <p>&copy; 2024 Pubky Template. Built with Next.js and Tailwind CSS.</p>
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