'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'

type RoleRequest = {
  id: string
  requester_email: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requested_at: string
  decided_at?: string | null
  decided_by_user_id?: string | null
  assigned_role_id?: string | null
  notes?: string | null
}

type AdminOverview = {
  currentUser?: {
    id: string
    roles: string[]
    isPlatformAdmin: boolean
    isEmailStakeholder: boolean
    canApproveEmailRequests: boolean
  }
  summary: {
    pendingRoleRequests: number
    pendingFormsTotal: number
    pendingEmailForms: number
    pendingVehicleForms: number
    pendingIdentityForms: number
    pendingGuestForms: number
    pendingUndertakingForms: number
  }
  queues: {
    latestPendingEmailForms: Array<{
      id: string
      applicant_name?: string
      status: string
      submitted_date?: string
      assigned_email_id?: string
      forwarding_authority?: string
      authorised_signatory_name?: string
      email_created_date?: string
      email_removal_date?: string
      email_created_by_name?: string
      approval_processed_by_name?: string
      approval_processed_at?: string
    }>
  }
  users: Array<{
    id: string
    email: string
    fullName: string
    userType: string
    createdAt: string
    roles: string[]
  }>
}

const ROLE_OPTIONS = [
  'Institute Admin',
  'Academics',
  'Establishment',
  'Research & Development',
  'Reporting Officer',
  'Section Head',
  'Department Head',
  'IT Admin',
  'Security Officer',
  'Guest House Admin',
  'Student',
  'Student Affairs',
  'Hostel Warden',
]

const FORWARDING_AUTHORITIES = ['Academics', 'Establishment', 'Research & Development'] as const
const EMAIL_ACTIONABLE_STATUSES = ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_OFFICER', 'APPROVED_BY_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS']

type EmailApprovalDraft = {
  forwarding_authority: string
  authorised_signatory_name: string
  assigned_email_id: string
  email_created_date: string
  email_removal_date: string
  email_created_by_name: string
}

export default function AdminDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([])
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [roleSelection, setRoleSelection] = useState<Record<string, string>>({})
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'emailQueue' | 'logs'>('requests')
  const [requestFilter, setRequestFilter] = useState({
    pending: true,
    approved: false,
    rejected: false,
  })
  const [emailApprovalDrafts, setEmailApprovalDrafts] = useState<Record<string, EmailApprovalDraft>>({})
  const [approvingEmailId, setApprovingEmailId] = useState<string | null>(null)

  const visibleRequests = useMemo(() => {
    const filtered = roleRequests.filter((request) => {
      if (requestFilter.pending && request.status === 'PENDING') return true
      if (requestFilter.approved && request.status === 'APPROVED') return true
      if (requestFilter.rejected && request.status === 'REJECTED') return true
      return false
    })

    const statusPriority: Record<RoleRequest['status'], number> = {
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 2,
    }

    return [...filtered].sort((a, b) => {
      const statusDelta = statusPriority[a.status] - statusPriority[b.status]
      if (statusDelta !== 0) return statusDelta
      return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    })
  }, [roleRequests, requestFilter])

  const decisionLogs = useMemo(() => {
    const usersById = new Map((overview?.users || []).map((u) => [u.id, u]))
    return roleRequests
      .filter((r) => r.status !== 'PENDING' && r.decided_at)
      .sort((a, b) => new Date(b.decided_at || '').getTime() - new Date(a.decided_at || '').getTime())
      .map((r) => {
        const approver = r.decided_by_user_id ? usersById.get(r.decided_by_user_id) : undefined
        return {
          ...r,
          approverName: approver?.fullName || 'Admin',
          approverEmail: approver?.email || '-',
        }
      })
  }, [roleRequests, overview?.users])

  const filteredUsers = useMemo(() => {
    const users = overview?.users || []
    const query = userSearchTerm.trim().toLowerCase()

    if (!query) return users

    return users.filter((user) => {
      const roleText = user.roles.join(' ').toLowerCase()
      return (
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.userType.toLowerCase().includes(query) ||
        roleText.includes(query)
      )
    })
  }, [overview?.users, userSearchTerm])

  const fetchData = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!token) {
      router.push('/login')
      return
    }

    const [requestsRes, overviewRes] = await Promise.all([
      fetch('/api/role-requests', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    if (requestsRes.status === 403 || overviewRes.status === 403) {
      router.push('/dashboard')
      return
    }

    const requestsPayload = await requestsRes.json()
    const overviewPayload = await overviewRes.json()

    setRoleRequests(requestsPayload.requests || [])
    setOverview(overviewPayload)
    setPageLoading(false)
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchData()
    }
  }, [user, loading, router])

  const handleDecision = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return

    const roleName = roleSelection[requestId]
    if (status === 'APPROVED' && !roleName) {
      alert('Select a role before approving')
      return
    }

    const response = await fetch(`/api/role-requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status,
        roleName: status === 'APPROVED' ? roleName : undefined,
      }),
    })

    if (!response.ok) {
      alert('Failed to update request')
      return
    }

    await fetchData()
  }

  const handleRequestFilterToggle = (key: 'pending' | 'approved' | 'rejected') => {
    setRequestFilter((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      }

      if (!next.pending && !next.approved && !next.rejected) {
        return { pending: true, approved: false, rejected: false }
      }

      return next
    })
  }

  const ensureEmailDraft = (id: string): EmailApprovalDraft => {
    return emailApprovalDrafts[id] || {
      forwarding_authority: 'Academics',
      authorised_signatory_name: '',
      assigned_email_id: '',
      email_created_date: new Date().toISOString().slice(0, 10),
      email_removal_date: '',
      email_created_by_name: '',
    }
  }

  const updateEmailDraft = (id: string, field: keyof EmailApprovalDraft, value: string) => {
    setEmailApprovalDrafts((prev) => ({
      ...prev,
      [id]: {
        ...ensureEmailDraft(id),
        [field]: value,
      },
    }))
  }

  const handleApproveEmailRequest = async (requestId: string) => {
    const draft = ensureEmailDraft(requestId)

    if (!draft.forwarding_authority || !draft.authorised_signatory_name || !draft.assigned_email_id || !draft.email_created_by_name) {
      alert('Fill forwarding authority, authorised signatory, assigned email ID, and ID created by before approving.')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return

    setApprovingEmailId(requestId)

    try {
      const response = await fetch(`/api/admin/email-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to approve email request')
      }

      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to approve email request')
    } finally {
      setApprovingEmailId(null)
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center text-gray-700">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4" />
          <p className="text-gray-500">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-transparent pt-16 px-6 pb-10 page-enter">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 pt-6">
          <h1 className="text-3xl font-bold electric-title">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Approve user role requests and monitor pending workflows</p>
        </div>

        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Pending Role Requests" value={overview.summary.pendingRoleRequests} color="text-amber-700" />
            <StatCard label="All Pending Forms" value={overview.summary.pendingFormsTotal} color="text-amber-700" />
            <StatCard label="Email Forms" value={overview.summary.pendingEmailForms} color="text-zinc-900" />
            <StatCard label="Vehicle Forms" value={overview.summary.pendingVehicleForms} color="text-zinc-900" />
            <StatCard label="Identity Forms" value={overview.summary.pendingIdentityForms} color="text-zinc-900" />
            <StatCard label="Guest House" value={overview.summary.pendingGuestForms} color="text-zinc-900" />
            <StatCard label="Undertaking" value={overview.summary.pendingUndertakingForms} color="text-zinc-900" />
          </div>
        )}

        <section className="pop-panel section-glass border border-gray-200 shadow-sm rounded-2xl p-3 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {(['requests', 'users', 'emailQueue', 'logs'] as const).map((tab) => {
              const labels = { requests: 'Role Requests', users: 'Users', emailQueue: 'Email Form Queue', logs: 'Approval Logs' }
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === tab
                      ? 'text-white shadow-sm'
                      : 'text-gray-500 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                  style={activeTab === tab ? { background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' } : {}}
                >
                  {labels[tab]}
                </button>
              )
            })}
          </div>
        </section>

        {activeTab === 'requests' && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <h2 className="text-xl font-semibold text-gray-900">User Role Requests</h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestFilter.pending}
                    onChange={() => handleRequestFilterToggle('pending')}
                    className="accent-emerald-600"
                  />
                  Pending role requests
                </label>
                <label className="inline-flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestFilter.approved}
                    onChange={() => handleRequestFilterToggle('approved')}
                    className="accent-emerald-600"
                  />
                  Approved only
                </label>
                <label className="inline-flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestFilter.rejected}
                    onChange={() => handleRequestFilterToggle('rejected')}
                    className="accent-red-600"
                  />
                  Rejected only
                </label>
              </div>
            </div>

            {visibleRequests.length === 0 ? (
              <p className="text-gray-500">No role requests found for selected filter.</p>
            ) : (
              <div className="space-y-4">
                {visibleRequests.map((request) => (
                  <div key={request.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <p className="text-gray-900 font-semibold">{request.requester_email}</p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        request.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : request.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Requested: {new Date(request.requested_at).toLocaleString()}</p>

                    {request.status === 'PENDING' ? (
                      <div className="mt-3 flex flex-col md:flex-row gap-3 md:items-center">
                        <select
                          value={roleSelection[request.id] || ''}
                          onChange={(e) => setRoleSelection((prev) => ({ ...prev, [request.id]: e.target.value }))}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                        >
                          <option value="">Select role</option>
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleDecision(request.id, 'APPROVED')}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(request.id, 'REJECTED')}
                          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-3">
                        Decision time: {request.decided_at ? new Date(request.decided_at).toLocaleString() : 'Not available'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">All Users and Roles</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {filteredUsers.length} of {overview?.users?.length || 0} users
                </p>
              </div>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search by name, email, type, or role"
                className="w-full md:w-96 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-gray-500">No users match your search.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Roles</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-900 font-medium">{userItem.fullName}</td>
                        <td className="px-4 py-3 text-gray-700">{userItem.email}</td>
                        <td className="px-4 py-3 text-gray-900 capitalize">{userItem.userType}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {userItem.roles.length > 0 ? userItem.roles.join(', ') : <span className="text-gray-400">No role assigned</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'logs' && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Role Approval Logs</h2>
            {decisionLogs.length === 0 ? (
              <p className="text-gray-500">No approval/rejection logs yet.</p>
            ) : (
              <div className="space-y-3">
                {decisionLogs.map((log) => (
                  <div key={log.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <p className="text-gray-900 font-semibold">{log.requester_email}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Status:{' '}
                      <span className={log.status === 'APPROVED' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                        {log.status}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {log.status === 'APPROVED' ? 'Approved at' : 'Rejected at'}:{' '}
                      {log.decided_at ? new Date(log.decided_at).toLocaleString() : 'Not available'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Decided by: {log.approverName} ({log.approverEmail})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'emailQueue' && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Pending Email Form Queue</h2>
            {overview?.queues?.latestPendingEmailForms?.length ? (
              <div className="space-y-2">
                {overview.queues.latestPendingEmailForms.map((item) => (
                  <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="text-gray-900 font-medium">{item.applicant_name || 'Applicant'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {item.status}
                      </span>
                    </div>

                    {!overview?.currentUser?.canApproveEmailRequests && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="font-medium text-gray-900">{item.status}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <p className="text-xs text-gray-500">Approved By</p>
                          <p className="font-medium text-gray-900">{item.approval_processed_by_name || '-'}</p>
                        </div>
                      </div>
                    )}

                    {overview?.currentUser?.canApproveEmailRequests && (
                      <>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Forwarding Authority *</label>
                        <select
                          value={ensureEmailDraft(item.id).forwarding_authority}
                          onChange={(e) => updateEmailDraft(item.id, 'forwarding_authority', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                        >
                          {FORWARDING_AUTHORITIES.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name of Authorised Signatory *</label>
                        <input
                          type="text"
                          value={ensureEmailDraft(item.id).authorised_signatory_name}
                          onChange={(e) => updateEmailDraft(item.id, 'authorised_signatory_name', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Email ID *</label>
                        <input
                          type="text"
                          value={ensureEmailDraft(item.id).assigned_email_id}
                          onChange={(e) => updateEmailDraft(item.id, 'assigned_email_id', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date of Creation *</label>
                        <input
                          type="date"
                          value={ensureEmailDraft(item.id).email_created_date}
                          onChange={(e) => updateEmailDraft(item.id, 'email_created_date', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tentative Date of Removal</label>
                        <input
                          type="date"
                          value={ensureEmailDraft(item.id).email_removal_date}
                          onChange={(e) => updateEmailDraft(item.id, 'email_removal_date', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">ID Created By *</label>
                        <input
                          type="text"
                          value={ensureEmailDraft(item.id).email_created_by_name}
                          onChange={(e) => updateEmailDraft(item.id, 'email_created_by_name', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                        />
                      </div>
                    </div>

                        <div className="mt-4 flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            Approved By: <span className="font-medium text-gray-700">{item.approval_processed_by_name || '-'}</span>
                          </div>
                          {EMAIL_ACTIONABLE_STATUSES.includes(item.status) && (
                            <button
                              onClick={() => handleApproveEmailRequest(item.id)}
                              disabled={approvingEmailId === item.id}
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
                            >
                              {approvingEmailId === item.id ? 'Approving...' : 'Approve and Close'}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pending email forms.</p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="pop-card section-glass rounded-xl border border-gray-200 shadow-sm p-4" style={{ ['--accent-a' as any]: '#d1fae5', ['--accent-b' as any]: '#a7f3d0', ['--accent-c' as any]: '#c4b5fd' }}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  )
}
