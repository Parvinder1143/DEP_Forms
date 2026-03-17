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
    isSuperAdmin: boolean
    isInstituteAdmin: boolean
    isEmailStakeholder: boolean
    canApproveEmailRequests: boolean
    canManageUndertakingRequests: boolean
    canViewUndertakingDetails: boolean
    canViewUndertakingQueue?: boolean
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
      applicant_title?: string
      applicant_initials?: string
      first_name?: string
      last_name?: string
      gender?: string
      permanent_address?: string
      organisation_id?: string
      nature_of_engagement?: string
      role?: string
      department_section?: string
      project_name?: string
      joining_date?: string
      anticipated_end_date?: string
      reporting_officer_name?: string
      reporting_officer_email?: string
      mobile_number?: string
      alternate_email?: string
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
      approval_remark?: string
      current_approval_stage?: string
      approval_level?: number
      can_take_action?: boolean
    }>
    latestPendingVehicleForms: Array<{
      id: string
      applicant_name?: string
      applicant_type?: string
      status: string
      submitted_date?: string
      designation?: string
      department_section?: string
      applicant_identifier?: string
      address?: string
      phone_number?: string
      email?: string
      driving_license_number?: string
      driving_license_valid_upto?: string
      approval_remark?: string
      approval_processed_by_name?: string
      approval_processed_at?: string
      stage_message?: string
      can_take_action?: boolean
    }>
    latestPendingIdentityForms: Array<{
      id: string
      applicant_name?: string
      status: string
      submitted_date?: string
      department_section?: string
      employee_code?: string
    }>
    latestPendingGuestForms: Array<{
      id: string
      guest_name?: string
      proposer_name?: string
      status: string
      submitted_date?: string
      room_type?: string
      room_category?: string
    }>
    latestPendingUndertakingForms: Array<{
      id: string
      student_name?: string
      status: string
      submitted_date?: string
      entry_number?: string
      course_name?: string
      department_name?: string
      hostel_room_number?: string
      email_address?: string
      date_of_joining?: string
      hef_amount?: number
      mess_security_fee?: number
      mess_admission_fee?: number
      mess_charges?: number
      blood_group?: string
      category?: string
      emergency_contact_number?: string
      parent_office_address?: string
      parent_residence_address?: string
      parent_mobile_number?: string
      parent_telephone_number?: string
      parent_email_id?: string
      local_guardian_office_address?: string
      local_guardian_residence_address?: string
      local_guardian_mobile_number?: string
      local_guardian_telephone_number?: string
      local_guardian_email_id?: string
      declaration_accepted?: boolean
      form_date?: string
      student_signature_name?: string
      parent_signature_name?: string
      reviewer_remarks?: string
      reviewed_by_name?: string
      reviewed_at?: string
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
  'Deputy Registrar',
  'Registrar',
  'Dean',
  'Academics',
  'Establishment',
  'Research & Development',
  'Reporting Officer',
  'Section Head',
  'Department Head',
  'Supervisor',
  'IT Admin',
  'Security Officer',
  'Guest House Admin',
  'Student',
  'Student Affairs',
  'Hostel Warden',
]

const EMAIL_ACTIONABLE_STATUSES = ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3', 'PENDING_OFFICER', 'APPROVED_BY_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS']
const EMAIL_PENDING_STATUSES = ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3', 'PENDING_OFFICER', 'APPROVED_BY_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS']
const EMAIL_COMPLETED_STATUSES = ['COMPLETED', 'REJECTED', 'APPROVED', 'CLOSED', 'ISSUED']
const VEHICLE_PENDING_STATUSES = ['SUBMITTED', 'PENDING_SUPERVISOR', 'APPROVED_BY_SUPERVISOR', 'PENDING_HOD', 'APPROVED_BY_HOD', 'PENDING_HOSTEL_WARDEN', 'APPROVED_BY_HOSTEL_WARDEN', 'PENDING_AFFAIRS', 'APPROVED_BY_AFFAIRS', 'PENDING_SECURITY']
const VEHICLE_COMPLETED_STATUSES = ['STICKER_ISSUED', 'REJECTED', 'CLOSED', 'EXPIRED']
const IDENTITY_PENDING_STATUSES = ['SUBMITTED', 'APPROVED_HOD', 'APPROVED_DIRECTOR']
const IDENTITY_COMPLETED_STATUSES = ['ISSUED', 'REJECTED', 'CANCELLED']
const GUEST_PENDING_STATUSES = ['SUBMITTED', 'PENDING_SUPERVISOR', 'APPROVED_BY_SUPERVISOR', 'PENDING_HOD', 'APPROVED_BY_HOD', 'PENDING_COMMITTEE', 'APPROVED_BY_COMMITTEE', 'PENDING_MANAGEMENT', 'WAITLISTED']
const GUEST_COMPLETED_STATUSES = ['CONFIRMED', 'CHECK_IN', 'ACTIVE', 'CHECK_OUT', 'COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW']
const UNDERTAKING_PENDING_STATUSES = ['SUBMITTED', 'REVIEWED']
const UNDERTAKING_COMPLETED_STATUSES = ['ACCEPTED', 'REJECTED']

type EmailApprovalDraft = {
  remarks: string
}

export default function AdminDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([])
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [roleSelection, setRoleSelection] = useState<Record<string, string>>({})
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'emailQueue' | 'vehicleQueue' | 'identityQueue' | 'guestQueue' | 'undertakingQueue' | 'logs'>('requests')
  const [requestFilter, setRequestFilter] = useState({
    pending: true,
    approved: false,
    rejected: false,
  })
  const [emailApprovalDrafts, setEmailApprovalDrafts] = useState<Record<string, EmailApprovalDraft>>({})
  const [approvingEmailId, setApprovingEmailId] = useState<string | null>(null)
  const [undertakingDecisionDrafts, setUndertakingDecisionDrafts] = useState<Record<string, string>>({})
  const [processingUndertakingId, setProcessingUndertakingId] = useState<string | null>(null)
  const [emailQueueTab, setEmailQueueTab] = useState<'pending' | 'completed'>('pending')
  const [vehicleQueueTab, setVehicleQueueTab] = useState<'pending' | 'completed'>('pending')
  const [identityQueueTab, setIdentityQueueTab] = useState<'pending' | 'completed'>('pending')
  const [expandedEmailDetails, setExpandedEmailDetails] = useState<Record<string, boolean>>({})
  const [expandedIdentityDetails, setExpandedIdentityDetails] = useState<Record<string, boolean>>({})
  const [guestQueueTab, setGuestQueueTab] = useState<'pending' | 'completed'>('pending')
  const [undertakingQueueTab, setUndertakingQueueTab] = useState<'pending' | 'completed'>('pending')

  const isPlatformAdmin = Boolean(overview?.currentUser?.isPlatformAdmin)
  const hasEstablishmentRole = Boolean((overview?.currentUser?.roles || []).some((role) => role.toLowerCase().includes('establish')))
  const canApproveEmailRequests = Boolean(overview?.currentUser?.canApproveEmailRequests)
  const shouldAbstractEmailDetails = hasEstablishmentRole && !isPlatformAdmin
  const canManageUndertakingRequests = Boolean(overview?.currentUser?.canManageUndertakingRequests)
  const canViewUndertakingDetails = Boolean(overview?.currentUser?.canViewUndertakingDetails)
  const canViewUndertakingQueue = Boolean(overview?.currentUser?.canViewUndertakingQueue)
  const canViewIdentityQueue = isPlatformAdmin || hasEstablishmentRole

  const visibleTabs: Array<'requests' | 'users' | 'emailQueue' | 'vehicleQueue' | 'identityQueue' | 'guestQueue' | 'undertakingQueue' | 'logs'> = isPlatformAdmin
    ? ['requests', 'users', 'emailQueue', 'vehicleQueue', 'identityQueue', 'guestQueue', 'undertakingQueue', 'logs']
    : hasEstablishmentRole
      ? ['emailQueue', 'identityQueue']
    : canViewUndertakingQueue
      ? ['undertakingQueue']
      : ['emailQueue']

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

  const emailQueueItems = overview?.queues?.latestPendingEmailForms || []
  const pendingEmailQueueItems = emailQueueItems.filter((item) => EMAIL_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const completedEmailQueueItems = emailQueueItems.filter((item) => EMAIL_COMPLETED_STATUSES.includes((item.status || '').toUpperCase()))

  const vehicleQueueItems = overview?.queues?.latestPendingVehicleForms || []
  const pendingVehicleQueueItems = vehicleQueueItems.filter((item) => !VEHICLE_COMPLETED_STATUSES.includes((item.status || '').toUpperCase()))
  const completedVehicleQueueItems = vehicleQueueItems.filter((item) => VEHICLE_COMPLETED_STATUSES.includes((item.status || '').toUpperCase()))

  const identityQueueItems = overview?.queues?.latestPendingIdentityForms || []
  const pendingIdentityQueueItems = identityQueueItems.filter((item) => IDENTITY_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const completedIdentityQueueItems = identityQueueItems.filter((item) => IDENTITY_COMPLETED_STATUSES.includes((item.status || '').toUpperCase()))

  const guestQueueItems = overview?.queues?.latestPendingGuestForms || []
  const pendingGuestQueueItems = guestQueueItems.filter((item) => GUEST_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const completedGuestQueueItems = guestQueueItems.filter((item) => GUEST_COMPLETED_STATUSES.includes((item.status || '').toUpperCase()))

  const undertakingQueueItems = overview?.queues?.latestPendingUndertakingForms || []
  const pendingUndertakingQueueItems = undertakingQueueItems.filter((item) => UNDERTAKING_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const completedUndertakingQueueItems = undertakingQueueItems.filter((item) => UNDERTAKING_COMPLETED_STATUSES.includes((item.status || '').toUpperCase()))

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

    if (overviewRes.status === 403) {
      router.push('/dashboard')
      return
    }

    const requestsPayload = await requestsRes.json()
    const overviewPayload = await overviewRes.json()

    setRoleRequests(requestsPayload.requests || [])
    setOverview(overviewPayload)
    const payloadIsPlatformAdmin = Boolean(overviewPayload?.currentUser?.isPlatformAdmin)
    const payloadCanApproveEmail = Boolean(overviewPayload?.currentUser?.canApproveEmailRequests)
    const payloadCanViewUndertakingQueue = Boolean(overviewPayload?.currentUser?.canViewUndertakingQueue)
    if (payloadCanViewUndertakingQueue && !payloadIsPlatformAdmin) {
      setActiveTab('undertakingQueue')
    } else if (payloadCanApproveEmail && !payloadIsPlatformAdmin) {
      setActiveTab('emailQueue')
    }
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
      remarks: '',
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

    if (!draft.remarks.trim()) {
      alert('Please enter remark before approving.')
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
        body: JSON.stringify({ action: 'APPROVE', remarks: draft.remarks }),
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

  const handleRejectEmailRequest = async (requestId: string) => {
    const draft = ensureEmailDraft(requestId)

    if (!draft.remarks.trim()) {
      alert('Please enter remark before rejecting.')
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
        body: JSON.stringify({ action: 'REJECT', remarks: draft.remarks }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to reject email request')
      }

      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reject email request')
    } finally {
      setApprovingEmailId(null)
    }
  }

  const handleUndertakingDecision = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    const remarks = (undertakingDecisionDrafts[requestId] || '').trim()
    if (!remarks) {
      alert('Please enter remark before processing undertaking request.')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return

    setProcessingUndertakingId(requestId)

    try {
      const response = await fetch(`/api/admin/undertaking/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remarks }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to process undertaking request')
      }

      setUndertakingDecisionDrafts((prev) => {
        const next = { ...prev }
        delete next[requestId]
        return next
      })
      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process undertaking request')
    } finally {
      setProcessingUndertakingId(null)
    }
  }

  const getQueueStatusBadge = (status?: string) => {
    const normalized = String(status || '').toUpperCase()

    if (['ACCEPTED', 'APPROVED', 'COMPLETED', 'CONFIRMED', 'ISSUED', 'STICKER_ISSUED', 'CHECK_IN', 'ACTIVE'].includes(normalized)) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    }

    if (['REJECTED', 'CANCELLED', 'NO_SHOW', 'CLOSED', 'EXPIRED'].includes(normalized)) {
      return 'bg-red-50 text-red-700 border border-red-200'
    }

    return 'bg-amber-50 text-amber-700 border border-amber-200'
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
          <p className="text-gray-500 mt-1">
            {isPlatformAdmin
              ? 'Approve user role requests and monitor pending workflows'
              : 'Review and process email ID request approvals'}
          </p>
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
          <div className={`grid gap-2 ${visibleTabs.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4 lg:grid-cols-8'}`}>
            {visibleTabs.map((tab) => {
              const labels = {
                requests: 'Role Requests',
                users: 'Users',
                emailQueue: 'Email Queue',
                vehicleQueue: 'Vehicle Queue',
                identityQueue: 'ID Card Queue',
                guestQueue: 'Guest House Queue',
                undertakingQueue: 'Undertaking Queue',
                logs: 'Approval Logs',
              }
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

        {activeTab === 'requests' && isPlatformAdmin && (
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

        {activeTab === 'users' && isPlatformAdmin && (
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

        {activeTab === 'logs' && isPlatformAdmin && (
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Email Form Queue
            </h2>
            {emailQueueItems.length ? (
              <div className="space-y-2">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setEmailQueueTab('pending')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${emailQueueTab === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Pending ({pendingEmailQueueItems.length})
                  </button>
                  <button
                    onClick={() => setEmailQueueTab('completed')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${emailQueueTab === 'completed' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Completed ({completedEmailQueueItems.length})
                  </button>
                </div>

                {(emailQueueTab === 'pending' ? pendingEmailQueueItems : completedEmailQueueItems).map((item) => (
                  <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="text-gray-900 font-medium">{item.applicant_name || 'Applicant'}</p>
                        <p className="text-xs text-gray-700 mt-0.5">Employee Code / Org ID: {item.organisation_id || '-'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getQueueStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    {shouldAbstractEmailDetails && (
                      <button
                        type="button"
                        onClick={() => setExpandedEmailDetails((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                      >
                        {expandedEmailDetails[item.id] ? 'Hide full details' : 'Show full details'}
                        <svg
                          className={`h-4 w-4 transition-transform ${expandedEmailDetails[item.id] ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}

                    {!overview?.currentUser?.canApproveEmailRequests && (!shouldAbstractEmailDetails || expandedEmailDetails[item.id]) && (
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
                        {(!shouldAbstractEmailDetails || expandedEmailDetails[item.id]) && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Title</p><p className="font-medium text-gray-900">{item.applicant_title || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Initials</p><p className="font-medium text-gray-900">{item.applicant_initials || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Gender</p><p className="font-medium text-gray-900">{item.gender || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Department/Section</p><p className="font-medium text-gray-900">{item.department_section || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Permanent Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.permanent_address || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Reporting Officer</p><p className="font-medium text-gray-900">{item.reporting_officer_name || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Reporting Officer Email</p><p className="font-medium text-gray-900">{item.reporting_officer_email || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Mobile</p><p className="font-medium text-gray-900">{item.mobile_number || '-'}</p></div>
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Alternate Email</p><p className="font-medium text-gray-900">{item.alternate_email || '-'}</p></div>
                        </div>
                        )}

                        {(!shouldAbstractEmailDetails || expandedEmailDetails[item.id]) && (
                          <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Remark *</label>
                            <textarea
                              value={ensureEmailDraft(item.id).remarks}
                              onChange={(e) => updateEmailDraft(item.id, 'remarks', e.target.value)}
                              rows={3}
                              placeholder="Write decision remark visible to user"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                            />
                          </div>
                        )}

                        {(item.approval_remark || item.approval_processed_by_name) && (!shouldAbstractEmailDetails || expandedEmailDetails[item.id]) && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                            <p className="text-xs text-gray-500">Latest Decision</p>
                            <p className="font-medium text-gray-900">{item.approval_remark || '-'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              By: {item.approval_processed_by_name || '-'} {item.approval_processed_at ? `on ${new Date(item.approval_processed_at).toLocaleString()}` : ''}
                            </p>
                          </div>
                        )}

                        {(!shouldAbstractEmailDetails || expandedEmailDetails[item.id]) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(item.can_take_action ?? EMAIL_ACTIONABLE_STATUSES.includes(item.status)) && (
                              <>
                                <button
                                  onClick={() => handleApproveEmailRequest(item.id)}
                                  disabled={approvingEmailId === item.id}
                                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
                                >
                                  {approvingEmailId === item.id ? 'Processing...' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleRejectEmailRequest(item.id)}
                                  disabled={approvingEmailId === item.id}
                                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
                                >
                                  {approvingEmailId === item.id ? 'Processing...' : 'Reject'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No email forms found.</p>
            )}
          </section>
        )}

        {activeTab === 'vehicleQueue' && isPlatformAdmin && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Vehicle Sticker Queue</h2>
            {vehicleQueueItems.length ? (
              <div className="space-y-2">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setVehicleQueueTab('pending')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${vehicleQueueTab === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Pending ({pendingVehicleQueueItems.length})
                  </button>
                  <button
                    onClick={() => setVehicleQueueTab('completed')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${vehicleQueueTab === 'completed' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Completed ({completedVehicleQueueItems.length})
                  </button>
                </div>

                {(vehicleQueueTab === 'pending' ? pendingVehicleQueueItems : completedVehicleQueueItems).map((item) => (
                  <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="text-gray-900 font-medium">{item.applicant_name || 'Applicant'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getQueueStatusBadge(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {vehicleQueueTab === 'pending' && (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="font-medium text-gray-900">{item.status || '-'}</p>
                        </div>
                      )}
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Department/Section</p>
                        <p className="font-medium text-gray-900">{item.department_section || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Applicant Identifier</p>
                        <p className="font-medium text-gray-900">{item.applicant_identifier || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No vehicle sticker forms found.</p>
            )}
          </section>
        )}

        {activeTab === 'identityQueue' && canViewIdentityQueue && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">ID Card Queue</h2>
            {identityQueueItems.length ? (
              <div className="space-y-2">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIdentityQueueTab('pending')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${identityQueueTab === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Pending ({pendingIdentityQueueItems.length})
                  </button>
                  <button
                    onClick={() => setIdentityQueueTab('completed')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${identityQueueTab === 'completed' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Completed ({completedIdentityQueueItems.length})
                  </button>
                </div>

                {(identityQueueTab === 'pending' ? pendingIdentityQueueItems : completedIdentityQueueItems).map((item) => (
                  <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="text-gray-900 font-medium">{item.applicant_name || 'Applicant'}</p>
                        <p className="text-xs text-gray-700 mt-0.5">Employee Code: {item.employee_code || '-'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getQueueStatusBadge(item.status)}`}>{item.status}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedIdentityDetails((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      {expandedIdentityDetails[item.id] ? 'Hide full details' : 'Show full details'}
                      <svg
                        className={`h-4 w-4 transition-transform ${expandedIdentityDetails[item.id] ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {expandedIdentityDetails[item.id] && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <p className="text-xs text-gray-500">Department/Section</p>
                          <p className="font-medium text-gray-900">{item.department_section || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No identity card forms found.</p>
            )}
          </section>
        )}

        {activeTab === 'guestQueue' && isPlatformAdmin && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Guest House Queue</h2>
            {guestQueueItems.length ? (
              <div className="space-y-2">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setGuestQueueTab('pending')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${guestQueueTab === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Pending ({pendingGuestQueueItems.length})
                  </button>
                  <button
                    onClick={() => setGuestQueueTab('completed')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${guestQueueTab === 'completed' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Completed ({completedGuestQueueItems.length})
                  </button>
                </div>

                {(guestQueueTab === 'pending' ? pendingGuestQueueItems : completedGuestQueueItems).map((item) => (
                  <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="text-gray-900 font-medium">{item.guest_name || 'Guest'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Proposed by: {item.proposer_name || '-'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getQueueStatusBadge(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Room Type</p>
                        <p className="font-medium text-gray-900">{item.room_type || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Room Category</p>
                        <p className="font-medium text-gray-900">{item.room_category || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No guest house forms found.</p>
            )}
          </section>
        )}

        {activeTab === 'undertakingQueue' && isPlatformAdmin && (
          <section className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Undertaking Queue</h2>
            {undertakingQueueItems.length ? (
              <div className="space-y-2">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setUndertakingQueueTab('pending')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${undertakingQueueTab === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Pending ({pendingUndertakingQueueItems.length})
                  </button>
                  <button
                    onClick={() => setUndertakingQueueTab('completed')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${undertakingQueueTab === 'completed' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                  >
                    Completed ({completedUndertakingQueueItems.length})
                  </button>
                </div>

                {(undertakingQueueTab === 'pending' ? pendingUndertakingQueueItems : completedUndertakingQueueItems).map((item) => (
                  <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="text-gray-900 font-medium">{item.student_name || 'Student'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getQueueStatusBadge(item.status)}`}>{item.status}</span>
                    </div>

                    {canViewUndertakingDetails ? (
                    <>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Course</p>
                        <p className="font-medium text-gray-900">{item.course_name || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Entry Number</p>
                        <p className="font-medium text-gray-900">{item.entry_number || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Department</p>
                        <p className="font-medium text-gray-900">{item.department_name || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Hostel Room</p>
                        <p className="font-medium text-gray-900">{item.hostel_room_number || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{item.email_address || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Date of Joining</p>
                        <p className="font-medium text-gray-900">{item.date_of_joining ? new Date(item.date_of_joining).toLocaleDateString() : '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">HEF</p>
                        <p className="font-medium text-gray-900">{item.hef_amount ?? '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Mess Security</p>
                        <p className="font-medium text-gray-900">{item.mess_security_fee ?? '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Mess Admission Fee</p>
                        <p className="font-medium text-gray-900">{item.mess_admission_fee ?? '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Mess Charges</p>
                        <p className="font-medium text-gray-900">{item.mess_charges ?? '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Blood Group</p>
                        <p className="font-medium text-gray-900">{item.blood_group || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Category</p>
                        <p className="font-medium text-gray-900">{item.category || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2">
                        <p className="text-xs text-gray-500">Emergency Contact</p>
                        <p className="font-medium text-gray-900">{item.emergency_contact_number || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Parent Office Address</p>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap">{item.parent_office_address || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Parent Residence Address</p>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap">{item.parent_residence_address || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Parent Mobile</p>
                        <p className="font-medium text-gray-900">{item.parent_mobile_number || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Parent Telephone</p>
                        <p className="font-medium text-gray-900">{item.parent_telephone_number || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2">
                        <p className="text-xs text-gray-500">Parent Email</p>
                        <p className="font-medium text-gray-900">{item.parent_email_id || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Local Guardian Office Address</p>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap">{item.local_guardian_office_address || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Local Guardian Residence Address</p>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap">{item.local_guardian_residence_address || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Local Guardian Mobile</p>
                        <p className="font-medium text-gray-900">{item.local_guardian_mobile_number || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Local Guardian Telephone</p>
                        <p className="font-medium text-gray-900">{item.local_guardian_telephone_number || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2">
                        <p className="text-xs text-gray-500">Local Guardian Email</p>
                        <p className="font-medium text-gray-900">{item.local_guardian_email_id || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Declaration Accepted</p>
                        <p className="font-medium text-gray-900">{item.declaration_accepted ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Form Date</p>
                        <p className="font-medium text-gray-900">{item.form_date ? new Date(item.form_date).toLocaleDateString() : '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Student Signature</p>
                        <p className="font-medium text-gray-900">{item.student_signature_name || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <p className="text-xs text-gray-500">Parent Signature</p>
                        <p className="font-medium text-gray-900">{item.parent_signature_name || '-'}</p>
                      </div>
                    </div>

                    {canManageUndertakingRequests && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Institute Admin Remark *</label>
                      <textarea
                        value={undertakingDecisionDrafts[item.id] || ''}
                        onChange={(e) => setUndertakingDecisionDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        rows={3}
                        placeholder="Write decision remark visible to user"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                      />
                    </div>
                    )}

                    {(item.reviewer_remarks || item.reviewed_by_name) && (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                        <p className="text-xs text-gray-500">Latest Decision</p>
                        <p className="font-medium text-gray-900">{item.reviewer_remarks || '-'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          By: {item.reviewed_by_name || '-'} {item.reviewed_at ? `on ${new Date(item.reviewed_at).toLocaleString()}` : ''}
                        </p>
                      </div>
                    )}

                    {canManageUndertakingRequests && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUndertakingDecision(item.id, 'ACCEPT')}
                        disabled={processingUndertakingId === item.id}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
                      >
                        {processingUndertakingId === item.id ? 'Processing...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleUndertakingDecision(item.id, 'REJECT')}
                        disabled={processingUndertakingId === item.id}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
                      >
                        {processingUndertakingId === item.id ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                    )}
                    </>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="font-medium text-gray-900">{item.status}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <p className="text-xs text-gray-500">Last Reviewed By</p>
                          <p className="font-medium text-gray-900">{item.reviewed_by_name || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No undertaking forms found.</p>
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
