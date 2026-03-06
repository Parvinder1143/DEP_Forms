'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { isInstituteEmail } from '@/lib/access'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function FormSection({ title, forms, icon, getStatusBadge }: any) {
  return (
    <div className="pop-panel section-glass rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-gray-400 text-xs">{forms.length} submission{forms.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {forms.map((form: any) => (
          <div key={form.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{form.applicant_name || form.student_name || form.proposer_name || form.guest_name || 'Application'}</p>
                <p className="text-gray-400 text-xs mt-0.5">{form.submitted_date ? new Date(form.submitted_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date pending'}</p>
                {form.assigned_email_id && (
                  <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                    <p>Assigned Email ID: <span className="font-medium text-gray-800">{form.assigned_email_id}</span></p>
                    <p>Forwarding Authority: <span className="font-medium text-gray-800">{form.forwarding_authority || '-'}</span></p>
                    <p>Authorised Signatory: <span className="font-medium text-gray-800">{form.authorised_signatory_name || '-'}</span></p>
                    <p>Date of Creation: <span className="font-medium text-gray-800">{form.email_created_date ? new Date(form.email_created_date).toLocaleDateString('en-IN') : '-'}</span></p>
                    <p>Tentative Removal: <span className="font-medium text-gray-800">{form.email_removal_date ? new Date(form.email_removal_date).toLocaleDateString('en-IN') : '-'}</span></p>
                    <p>ID Created By: <span className="font-medium text-gray-800">{form.email_created_by_name || '-'}</span></p>
                  </div>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(form.status)}`}>
                {form.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const FORM_CATALOG = [
  { href: '/forms/email-request', label: 'Email ID', icon: '✉️', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', hoverBorder: 'hover:border-emerald-200', actionText: 'text-emerald-700', accentA: '#bbf7d0', accentB: '#6ee7b7', accentC: '#d9f99d' },
  { href: '/forms/guest-house', label: 'Guest House', icon: '🏠', badgeBg: 'bg-teal-50', badgeText: 'text-teal-700', hoverBorder: 'hover:border-teal-200', actionText: 'text-teal-700', accentA: '#99f6e4', accentB: '#5eead4', accentC: '#86efac' },
  { href: '/forms/identity-card', label: 'Identity Card', icon: '🆔', badgeBg: 'bg-violet-50', badgeText: 'text-violet-700', hoverBorder: 'hover:border-violet-200', actionText: 'text-violet-700', accentA: '#ddd6fe', accentB: '#c4b5fd', accentC: '#a5b4fc' },
  { href: '/forms/vehicle-sticker', label: 'Vehicle Sticker', icon: '🚗', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', hoverBorder: 'hover:border-amber-200', actionText: 'text-amber-700', accentA: '#fde68a', accentB: '#fcd34d', accentC: '#fdba74' },
  { href: '/forms/undertaking', label: 'Undertaking', icon: '✍️', badgeBg: 'bg-fuchsia-50', badgeText: 'text-fuchsia-700', hoverBorder: 'hover:border-fuchsia-200', actionText: 'text-fuchsia-700', accentA: '#f5d0fe', accentB: '#f0abfc', accentC: '#c4b5fd' },
]

function getAllowedForms(isInstituteUser: boolean, roles: string[]) {
  if (!isInstituteUser) {
    return FORM_CATALOG.filter((f) => ['/forms/email-request', '/forms/guest-house'].includes(f.href))
  }

  if (roles.length === 0) {
    return []
  }

  if (roles.includes('Super Admin') || roles.includes('Institute Admin')) {
    return FORM_CATALOG
  }

  const allowed = new Set<string>()

  for (const role of roles) {
    if (role === 'IT Admin') {
      allowed.add('/forms/email-request')
      allowed.add('/forms/identity-card')
    }
    if (role === 'Guest House Admin') {
      allowed.add('/forms/guest-house')
    }
    if (role === 'Student') {
      allowed.add('/forms/guest-house')
    }
    if (role === 'Security Officer') {
      allowed.add('/forms/vehicle-sticker')
    }
    if (role === 'Reporting Officer' || role === 'Section Head' || role === 'Department Head' || role === 'Student Affairs' || role === 'Student') {
      allowed.add('/forms/email-request')
      allowed.add('/forms/vehicle-sticker')
      allowed.add('/forms/undertaking')
    }
  }

  return FORM_CATALOG.filter((f) => allowed.has(f.href))
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const isInstituteUser = isInstituteEmail(user?.email)
  const isAdminEmail = (user?.email || '').toLowerCase() === 'admin@iitrpr.ac.in'
  const [emailRequests, setEmailRequests] = useState<any[]>([])
  const [vehicleApps, setVehicleApps] = useState<any[]>([])
  const [identityCardForms, setIdentityCardForms] = useState<any[]>([])
  const [guestHouseRes, setGuestHouseRes] = useState<any[]>([])
  const [undertakingForms, setUndertakingForms] = useState<any[]>([])
  const [roleNames, setRoleNames] = useState<string[]>([])
  const [roleRequestStatus, setRoleRequestStatus] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    async function loadRoleState() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (!token) {
          setRoleLoading(false)
          return
        }

        const response = await fetch('/api/role-requests', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = await response.json()

        if (isAdminEmail) {
          router.push('/admin')
          return
        }

        const roles = payload.roles || []
        setRoleNames(Array.isArray(roles) ? roles : [])

        if (payload.request?.status) {
          setRoleRequestStatus(payload.request.status)
        }

        if (isInstituteUser && roles.length === 0 && !payload.request) {
          const createResponse = await fetch('/api/role-requests', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          const createPayload = await createResponse.json()
          setRoleRequestStatus(createPayload.request?.status || 'PENDING')
        }
      } catch (error) {
        console.error('Error loading role state:', error)
      } finally {
        setRoleLoading(false)
      }
    }

    loadRoleState()
  }, [user, isInstituteUser, isAdminEmail, router])

  useEffect(() => {
    if (user) {
      async function fetchData() {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token

          if (!token) {
            setEmailRequests([])
            setVehicleApps([])
            setIdentityCardForms([])
            setGuestHouseRes([])
            setUndertakingForms([])
            return
          }

          const authHeaders = { Authorization: `Bearer ${token}` }

          const [email, vehicle, identity, guest, undertaking] = await Promise.all([
            fetch('/api/email-requests', { headers: authHeaders }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/vehicle-stickers', { headers: authHeaders }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/identity-card', { headers: authHeaders }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/guest-house', { headers: authHeaders }).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/undertaking', { headers: authHeaders }).then(r => r.ok ? r.json() : []).catch(() => []),
          ])

          setEmailRequests(Array.isArray(email) ? email : [])
          setVehicleApps(Array.isArray(vehicle) ? vehicle : [])
          setIdentityCardForms(Array.isArray(identity) ? identity : [])
          setGuestHouseRes(Array.isArray(guest) ? guest : [])
          setUndertakingForms(Array.isArray(undertaking) ? undertaking : [])
        } catch (error) {
          console.error('Error fetching data:', error)
        } finally {
          setDataLoading(false)
        }
      }

      fetchData()
    }
  }, [user])

  const totalForms = emailRequests.length + vehicleApps.length + identityCardForms.length + guestHouseRes.length + undertakingForms.length
  const allForms = [...emailRequests, ...vehicleApps, ...identityCardForms, ...guestHouseRes, ...undertakingForms]
  const approvedCount = allForms.filter((f: any) => f.status?.includes('APPROVED') || f.status === 'ISSUED' || f.status === 'ACCEPTED' || f.status === 'COMPLETED').length
  const pendingCount = allForms.filter((f: any) => f.status === 'SUBMITTED' || f.status === 'PENDING_OFFICER' || f.status === 'PENDING_SUPERVISOR').length
  const allowedForms = getAllowedForms(isInstituteUser, roleNames)
  const primaryRole = roleNames[0] || null

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'SUBMITTED': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_OFFICER': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_SUPERVISOR': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'COMPLETED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'ISSUED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'ACCEPTED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'REJECTED': 'bg-red-50 text-red-700 border border-red-200',
    }
    return styles[status] || 'bg-gray-50 text-gray-600 border border-gray-200'
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading || dataLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-black border-t-transparent mb-4"></div>
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  if (isInstituteUser && roleNames.length === 0) {
    return (
      <main className="min-h-screen bg-transparent pt-16 page-enter">
        <div className="bg-white border-b border-gray-200 py-6 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold electric-title">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Awaiting role assignment</p>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-6 py-12">
          <div className="pop-panel section-glass rounded-xl border border-zinc-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Dashboard is being prepared</h2>
            <p className="text-gray-500 text-sm mb-3">Your IIT Ropar account has been detected. A role request has been submitted to admin for approval.</p>
            <p className="text-sm text-gray-700">Status: <span className="font-semibold text-zinc-900">{roleRequestStatus || 'PENDING'}</span></p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-transparent pt-16 page-enter">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold electric-title">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your institutional forms</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!isInstituteUser && (
          <div className="mb-6 rounded-xl section-glass border border-zinc-200 bg-zinc-50 px-5 py-4">
            <p className="text-sm text-zinc-900">
              Limited access — log in with your IIT Ropar email (<span className="font-mono">@iitrpr.ac.in</span>) to access all institute forms.
            </p>
          </div>
        )}

        {primaryRole && (
          <div className="mb-6 rounded-xl section-glass border border-zinc-200 bg-zinc-50 px-5 py-3">
            <p className="text-sm text-zinc-900">Assigned role: <span className="font-semibold">{primaryRole}</span></p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="pop-card bg-white rounded-xl shadow-sm p-6" style={{ ['--accent-a' as any]: '#e5e7eb', ['--accent-b' as any]: '#cbd5e1', ['--accent-c' as any]: '#d1d5db' }}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Total Forms</p>
            <p className="text-4xl font-bold text-gray-900">{totalForms}</p>
            <p className="text-gray-400 text-xs mt-1">All submissions</p>
          </div>
          <div className="pop-card bg-white rounded-xl shadow-sm p-6" style={{ ['--accent-a' as any]: '#bbf7d0', ['--accent-b' as any]: '#6ee7b7', ['--accent-c' as any]: '#bef264' }}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Approved</p>
            <p className="text-4xl font-bold text-emerald-700">{approvedCount}</p>
            <p className="text-gray-400 text-xs mt-1">Completed</p>
          </div>
          <div className="pop-card bg-white rounded-xl shadow-sm p-6" style={{ ['--accent-a' as any]: '#fde68a', ['--accent-b' as any]: '#fcd34d', ['--accent-c' as any]: '#fdba74' }}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Pending</p>
            <p className="text-4xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-gray-400 text-xs mt-1">Awaiting approval</p>
          </div>
        </div>

        {/* Quick Actions */}
        {allowedForms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Submit New Form</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {allowedForms.map((form) => (
                <Link
                  key={form.href}
                  href={form.href}
                  className={`pop-card bg-white rounded-xl shadow-sm p-4 ${form.hoverBorder} hover:shadow-md transition group text-center`}
                  style={{ ['--accent-a' as any]: form.accentA, ['--accent-b' as any]: form.accentB, ['--accent-c' as any]: form.accentC }}
                >
                  <div className={`mx-auto mb-2 w-10 h-10 rounded-lg flex items-center justify-center text-xl ${form.badgeBg} ${form.badgeText}`}>{form.icon}</div>
                  <h3 className="text-gray-900 font-semibold text-sm leading-tight">{form.label}</h3>
                  <p className={`text-xs mt-1 font-medium ${form.actionText}`}>Submit →</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Submissions */}
        <div className="space-y-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Submissions</h2>
          {totalForms === 0 ? (
            <div className="pop-panel section-glass rounded-xl border border-gray-200 shadow-sm py-16 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-900 font-semibold mb-2">No forms submitted yet</p>
              <p className="text-gray-400 text-sm mb-6">Submit a form above to see it here</p>
              {allowedForms.length > 0 && (
                <Link href={allowedForms[0].href} className="inline-block pop-cta btn-neon px-6 py-2.5 bg-black text-white font-semibold rounded-lg hover:bg-zinc-800 transition text-sm">
                  Submit Your First Form
                </Link>
              )}
            </div>
          ) : (
            <>
              {emailRequests.length > 0 && <FormSection title="Email ID Requests" forms={emailRequests} icon="✉️" getStatusBadge={getStatusBadge} />}
              {vehicleApps.length > 0 && <FormSection title="Vehicle Sticker Applications" forms={vehicleApps} icon="🚗" getStatusBadge={getStatusBadge} />}
              {identityCardForms.length > 0 && <FormSection title="Identity Card Applications" forms={identityCardForms} icon="🆔" getStatusBadge={getStatusBadge} />}
              {guestHouseRes.length > 0 && <FormSection title="Guest House Reservations" forms={guestHouseRes} icon="🏠" getStatusBadge={getStatusBadge} />}
              {undertakingForms.length > 0 && <FormSection title="Undertaking Declarations" forms={undertakingForms} icon="✍️" getStatusBadge={getStatusBadge} />}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
