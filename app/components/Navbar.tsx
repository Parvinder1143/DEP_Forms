'use client'

import { useAuth } from '@/app/context/AuthContext'
import { isInstituteEmail } from '@/lib/access'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showForms, setShowForms] = useState(false)
  const [roleNames, setRoleNames] = useState<string[]>([])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  useEffect(() => {
    if (!user) {
      setRoleNames([])
      return
    }

    async function fetchRoles() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) return

        const response = await fetch('/api/role-requests', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = await response.json()
        setRoleNames(Array.isArray(payload.roles) ? payload.roles : [])
      } catch (error) {
        console.error('Error fetching navbar roles:', error)
      }
    }

    fetchRoles()
  }, [user])

  const isInstituteUser = isInstituteEmail(user?.email)
  const isAdminAccount = (user?.email || '').toLowerCase() === 'admin@iitrpr.ac.in' || roleNames.includes('Super Admin') || roleNames.includes('Institute Admin')
  const canAccessAllForms = !isInstituteUser || roleNames.length > 0 || isAdminAccount

  const forms = [
    ...(!isInstituteUser
      ? [
          { name: 'Email ID Request', href: '/forms/email-request' },
          { name: 'Guest House', href: '/forms/guest-house' },
        ]
      : []),
    ...(isInstituteUser && canAccessAllForms
      ? [
          { name: 'Email ID Request', href: '/forms/email-request' },
          { name: 'Guest House', href: '/forms/guest-house' },
        ]
      : []),
    ...(isInstituteUser && canAccessAllForms
      ? [
          { name: 'Vehicle Sticker', href: '/forms/vehicle-sticker' },
          { name: 'Identity Card', href: '/forms/identity-card' },
          { name: 'Undertaking', href: '/forms/undertaking' },
        ]
      : []),
  ]

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/92 backdrop-blur-sm border-b border-gray-100" style={{ boxShadow: '0 2px 18px rgba(0,0,0,0.12)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center gap-4">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 hover:opacity-80 transition shrink-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #111111 0%, #065f46 100%)' }}>
              <span className="text-white font-bold text-sm">IR</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">IIT Ropar</h1>
              <p className="text-xs font-medium leading-tight text-emerald-700">Forms Portal</p>
            </div>
          </Link>

          {/* Center Navigation */}
          {user && (
            <div className="hidden lg:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-2 text-sm text-gray-600 rounded-lg transition-colors font-medium hover:text-zinc-900 hover:bg-zinc-100">
                Dashboard
              </Link>
              {isAdminAccount && (
                <Link href="/admin" className="px-3 py-2 text-sm text-gray-600 rounded-lg transition-colors font-medium hover:text-zinc-900 hover:bg-zinc-100">
                  Admin
                </Link>
              )}
              {forms.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowForms(!showForms)}
                    className="px-3 py-2 text-sm text-gray-600 rounded-lg transition-colors font-medium flex items-center gap-1 hover:text-zinc-900 hover:bg-zinc-100"
                  >
                    Forms
                    <span className={`text-xs transition-transform ${showForms ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {showForms && (
                    <div className="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                      {forms.map((form) => (
                        <Link
                          key={form.href}
                          href={form.href}
                          onClick={() => setShowForms(false)}
                          className="block px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        >
                          {form.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right side */}
          {user ? (
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-gray-400 hidden md:block truncate max-w-50 font-medium">{user.email}</span>
              <div className="relative lg:hidden">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="pop-cta px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-zinc-100 hover:border-zinc-300 transition"
                >
                  Menu ▾
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors" onClick={() => setShowMenu(false)}>Dashboard</Link>
                    {isAdminAccount && (
                      <Link href="/admin" className="block px-4 py-2 text-sm text-gray-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors" onClick={() => setShowMenu(false)}>Admin</Link>
                    )}
                    {forms.map((form) => (
                      <Link key={form.href} href={form.href} className="block px-4 py-2 text-sm text-gray-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors" onClick={() => setShowMenu(false)}>
                        {form.name}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={() => { setShowMenu(false); handleSignOut() }} className="w-full text-left px-4 py-2 text-sm font-medium transition hover:bg-zinc-100" style={{ color: '#111111' }}>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="hidden lg:block pop-cta px-4 py-2 text-sm font-semibold text-white rounded-lg transition cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #111111 0%, #065f46 100%)' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-3 py-2 text-sm font-medium text-gray-600 transition hover:text-zinc-900">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="pop-cta px-4 py-2 text-sm font-semibold text-white rounded-lg transition"
                style={{ background: 'linear-gradient(135deg, #111111 0%, #065f46 100%)' }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
