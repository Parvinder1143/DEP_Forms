'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { isInstituteEmail } from '@/lib/access'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function isIdentityCardForm(form: any) {
  return Boolean(form?.identity_card_type || form?.employee_code || form?.request_type)
}

function isVehicleStickerForm(form: any) {
  return Boolean(form?.driving_license_number || form?.driving_license_valid_upto)
}

function getIdentityStatusMessage(form: any) {
  const status = String(form?.status || '').toUpperCase()

  if (status === 'SUBMITTED') {
    return 'Current status: Stage 1 pending - Section Head/HOD review.'
  }
  if (status === 'APPROVED_HOD') {
    return 'Current status: Stage 2 pending - Deputy Registrar/Establishment review.'
  }
  if (status === 'APPROVED_DIRECTOR') {
    return 'Current status: Stage 3 pending - Registrar/Dean review.'
  }
  if (status === 'ISSUED') {
    return 'Current status: Approved at all three stages and card issued.'
  }
  if (status === 'REJECTED') {
    return 'Current status: Rejected during approval workflow.'
  }
  if (status === 'CANCELLED') {
    return 'Current status: Application cancelled.'
  }

  return 'Current status: Under review.'
}

function getVehicleStatusMessage(form: any) {
  const status = String(form?.status || '').toUpperCase()

  if (status === 'SUBMITTED' || status === 'PENDING_SUPERVISOR') {
    return 'Current status: Stage 1 pending - Supervisor review.'
  }
  if (status === 'PENDING_HOD' || status === 'APPROVED_BY_SUPERVISOR') {
    return 'Current status: Stage 2 pending - HOD/Department Head review.'
  }
  if (status === 'PENDING_HOSTEL_WARDEN' || status === 'APPROVED_BY_HOD') {
    return 'Current status: Stage 3 pending - Hostel Warden review.'
  }
  if (status === 'PENDING_AFFAIRS' || status === 'APPROVED_BY_HOSTEL_WARDEN') {
    return 'Current status: Stage 4 pending - Student Affairs review.'
  }
  if (status === 'PENDING_SECURITY' || status === 'APPROVED_BY_AFFAIRS') {
    return 'Current status: Stage 5 pending - Security Officer review.'
  }
  if (status === 'STICKER_ISSUED') {
    return 'Current status: Approved at all five stages and sticker issued.'
  }
  if (status === 'REJECTED') {
    return 'Current status: Rejected during approval workflow.'
  }
  if (status === 'CLOSED') {
    return 'Current status: Application closed.'
  }
  if (status === 'EXPIRED') {
    return 'Current status: Sticker expired.'
  }

  return 'Current status: Under review.'
}

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
                {isIdentityCardForm(form) && (
                  <p className="mt-2 text-xs text-gray-700 font-medium">{getIdentityStatusMessage(form)}</p>
                )}
                {isVehicleStickerForm(form) && (
                  <p className="mt-2 text-xs text-gray-700 font-medium">{getVehicleStatusMessage(form)}</p>
                )}
                {form.approval_remark && (
                  <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-700">
                    <p className="font-semibold text-gray-800">Stakeholder Remark</p>
                    <p className="mt-0.5">{form.approval_remark}</p>
                    <p className="mt-1 text-gray-500">
                      By: {form.approval_processed_by_name || '-'} {form.approval_processed_at ? `on ${new Date(form.approval_processed_at).toLocaleString()}` : ''}
                    </p>
                  </div>
                )}
                {form.reviewer_remarks && (
                  <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-700">
                    <p className="font-semibold text-gray-800">Institute Admin Remark</p>
                    <p className="mt-0.5">{form.reviewer_remarks}</p>
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

  if (roles.includes('Institute Admin')) {
    return []
  }

  if (roles.includes('Super Admin') || roles.includes('System Admin')) {
    return FORM_CATALOG
  }

  const hasNoFormStakeholderRole = roles.some((role) => isNoFormsStakeholderRole(role))
  if (hasNoFormStakeholderRole) {
    return []
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
      allowed.add('/forms/identity-card')
    }
    if (role === 'Security Officer') {
      // Security Officer should review queue only, not submit forms.
    }
    if (role === 'Reporting Officer' || role === 'Section Head' || role === 'Department Head' || role === 'Student Affairs' || role === 'Student') {
      allowed.add('/forms/email-request')
      allowed.add('/forms/vehicle-sticker')
      allowed.add('/forms/undertaking')
    }
  }

  return FORM_CATALOG.filter((f) => allowed.has(f.href))
}

function normalizeRole(role: string) {
  return role.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()
}

function isEmailStakeholderRole(role: string) {
  const normalized = normalizeRole(role)
  return normalized.includes('establish')
}

function isIdentityQueueStakeholderRole(role: string) {
  const normalized = normalizeRole(role)
  return (
    normalized.includes('section head') ||
    normalized.includes('department head') ||
    normalized === 'hod' ||
    normalized.includes('deputy registrar') ||
    normalized.includes('establish') ||
    normalized === 'registrar' ||
    normalized === 'dean'
  )
}

function isVehicleQueueStakeholderRole(role: string) {
  const normalized = normalizeRole(role)
  return (
    normalized.includes('supervisor') ||
    normalized === 'hod' ||
    normalized.includes('department head') ||
    normalized.includes('hostel warden') ||
    normalized.includes('student affairs') ||
    normalized.includes('security officer')
  )
}

function isNoFormsStakeholderRole(role: string) {
  const normalized = normalizeRole(role)
  return (
    normalized.includes('section head') ||
    normalized.includes('department head') ||
    normalized === 'hod' ||
    normalized.includes('deputy registrar') ||
    normalized.includes('establish') ||
    normalized.includes('student affairs') ||
    normalized.includes('security officer') ||
    normalized === 'registrar' ||
    normalized === 'dean'
  )
}

function isInstituteAdminRole(role: string) {
  return normalizeRole(role) === 'institute admin'
}

const EMAIL_PENDING_STATUSES = ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3', 'PENDING_OFFICER', 'APPROVED_BY_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS']
const EMAIL_CLOSED_STATUSES = ['COMPLETED', 'REJECTED', 'APPROVED', 'CLOSED', 'ISSUED']
const VEHICLE_PENDING_STATUSES = ['SUBMITTED', 'PENDING_SUPERVISOR', 'APPROVED_BY_SUPERVISOR', 'PENDING_HOD', 'APPROVED_BY_HOD', 'PENDING_HOSTEL_WARDEN', 'APPROVED_BY_HOSTEL_WARDEN', 'PENDING_AFFAIRS', 'APPROVED_BY_AFFAIRS', 'PENDING_SECURITY']
const VEHICLE_CLOSED_STATUSES = ['STICKER_ISSUED', 'REJECTED', 'CLOSED', 'EXPIRED']
const UNDERTAKING_PENDING_STATUSES = ['SUBMITTED', 'REVIEWED']
const UNDERTAKING_CLOSED_STATUSES = ['ACCEPTED', 'REJECTED']
const IDENTITY_PENDING_STATUSES = ['SUBMITTED', 'APPROVED_HOD', 'APPROVED_DIRECTOR']
const IDENTITY_CLOSED_STATUSES = ['ISSUED', 'REJECTED', 'CANCELLED']

type EmailApprovalDraft = {
  remarks: string
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const isInstituteUser = isInstituteEmail(user?.email)
  const normalizedUserEmail = (user?.email || '').toLowerCase()
  const isSystemAdminEmail = normalizedUserEmail === 'admin@iitrpr.ac.in'
  const isInstituteAdminStakeholderEmail = normalizedUserEmail === 'institute_admin@iitrpr.ac.in'
  const [emailRequests, setEmailRequests] = useState<any[]>([])
  const [vehicleApps, setVehicleApps] = useState<any[]>([])
  const [identityCardForms, setIdentityCardForms] = useState<any[]>([])
  const [guestHouseRes, setGuestHouseRes] = useState<any[]>([])
  const [undertakingForms, setUndertakingForms] = useState<any[]>([])
  const [roleNames, setRoleNames] = useState<string[]>([])
  const [roleRequestStatus, setRoleRequestStatus] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [showEmailQueue, setShowEmailQueue] = useState(false)
  const [emailQueueLoading, setEmailQueueLoading] = useState(false)
  const [emailQueueError, setEmailQueueError] = useState<string | null>(null)
  const [emailQueueItems, setEmailQueueItems] = useState<any[]>([])
  const [expandedEmailDetails, setExpandedEmailDetails] = useState<Record<string, boolean>>({})
  const [selectedEmailItems, setSelectedEmailItems] = useState<Record<string, boolean>>({})
  const [bulkEmailRemark, setBulkEmailRemark] = useState('')
  const [bulkEmailProcessing, setBulkEmailProcessing] = useState(false)
  const [emailApprovalDrafts, setEmailApprovalDrafts] = useState<Record<string, EmailApprovalDraft>>({})
  const [approvingEmailId, setApprovingEmailId] = useState<string | null>(null)
  const [emailQueueTab, setEmailQueueTab] = useState<'pending' | 'completed'>('pending')
  const [showIdentityQueue, setShowIdentityQueue] = useState(false)
  const [identityQueueLoading, setIdentityQueueLoading] = useState(false)
  const [identityQueueError, setIdentityQueueError] = useState<string | null>(null)
  const [identityQueueItems, setIdentityQueueItems] = useState<any[]>([])
  const [identityQueueTab, setIdentityQueueTab] = useState<'pending' | 'completed'>('pending')
  const [expandedIdentityDetails, setExpandedIdentityDetails] = useState<Record<string, boolean>>({})
  const [selectedIdentityItems, setSelectedIdentityItems] = useState<Record<string, boolean>>({})
  const [bulkIdentityRemark, setBulkIdentityRemark] = useState('')
  const [bulkIdentityProcessing, setBulkIdentityProcessing] = useState(false)
  const [identityDecisionDrafts, setIdentityDecisionDrafts] = useState<Record<string, string>>({})
  const [processingIdentityId, setProcessingIdentityId] = useState<string | null>(null)
  const [showVehicleQueue, setShowVehicleQueue] = useState(false)
  const [vehicleQueueLoading, setVehicleQueueLoading] = useState(false)
  const [vehicleQueueError, setVehicleQueueError] = useState<string | null>(null)
  const [vehicleQueueItems, setVehicleQueueItems] = useState<any[]>([])
  const [expandedVehicleDetails, setExpandedVehicleDetails] = useState<Record<string, boolean>>({})
  const [selectedVehicleItems, setSelectedVehicleItems] = useState<Record<string, boolean>>({})
  const [bulkVehicleRemark, setBulkVehicleRemark] = useState('')
  const [bulkVehicleProcessing, setBulkVehicleProcessing] = useState(false)
  const [vehicleQueueTab, setVehicleQueueTab] = useState<'pending' | 'completed'>('pending')
  const [vehicleDecisionDrafts, setVehicleDecisionDrafts] = useState<Record<string, string>>({})
  const [processingVehicleId, setProcessingVehicleId] = useState<string | null>(null)
  const [showUndertakingQueue, setShowUndertakingQueue] = useState(false)
  const [undertakingQueueLoading, setUndertakingQueueLoading] = useState(false)
  const [undertakingQueueError, setUndertakingQueueError] = useState<string | null>(null)
  const [undertakingQueueItems, setUndertakingQueueItems] = useState<any[]>([])
  const [expandedUndertakingDetails, setExpandedUndertakingDetails] = useState<Record<string, boolean>>({})
  const [selectedUndertakingItems, setSelectedUndertakingItems] = useState<Record<string, boolean>>({})
  const [bulkUndertakingRemark, setBulkUndertakingRemark] = useState('')
  const [bulkUndertakingProcessing, setBulkUndertakingProcessing] = useState(false)
  const [undertakingQueueTab, setUndertakingQueueTab] = useState<'pending' | 'completed'>('pending')
  const [undertakingRemarks, setUndertakingRemarks] = useState<Record<string, string>>({})
  const [processingUndertakingId, setProcessingUndertakingId] = useState<string | null>(null)

  const resolveAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    let token = sessionData.session?.access_token || null

    if (!token) {
      const { data: refreshData } = await supabase.auth.refreshSession()
      token = refreshData.session?.access_token || null
    }

    return token
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    async function loadRoleState() {
      try {
        let token = await resolveAccessToken()

        if (!token) {
          setRoleLoading(false)
          return
        }

        let response = await fetch('/api/role-requests', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 401) {
          token = await resolveAccessToken()
          if (!token) {
            router.push('/login')
            return
          }

          response = await fetch('/api/role-requests', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        }

        if (!response.ok) {
          throw new Error(`Role fetch failed with status ${response.status}`)
        }

        const payload = await response.json()

        if (isSystemAdminEmail) {
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

          if (!createResponse.ok) {
            throw new Error(`Role request create failed with status ${createResponse.status}`)
          }

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
  }, [user, isInstituteUser, isSystemAdminEmail, isInstituteAdminStakeholderEmail, router])

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
  const pendingCount = allForms.filter((f: any) => ['SUBMITTED', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3', 'PENDING_OFFICER', 'PENDING_SUPERVISOR', 'PENDING_HOD', 'PENDING_HOSTEL_WARDEN', 'PENDING_AFFAIRS', 'PENDING_SECURITY'].includes(f.status)).length
  const allowedForms = getAllowedForms(isInstituteUser, roleNames)
  const primaryRole = roleNames[0] || null
  const canReviewEmailQueue = roleNames.some(isEmailStakeholderRole)
  const canReviewVehicleQueue = roleNames.some(isVehicleQueueStakeholderRole)
  const canReviewIdentityQueue = roleNames.some(isIdentityQueueStakeholderRole)
  const canReviewUndertakingQueue = roleNames.some(isInstituteAdminRole) || isInstituteAdminStakeholderEmail
  const canReviewAnyQueue = canReviewEmailQueue || canReviewVehicleQueue || canReviewIdentityQueue || canReviewUndertakingQueue
  const isStakeholderOnly = canReviewAnyQueue && allowedForms.length === 0
  const pendingEmailQueueItems = emailQueueItems.filter((item) => EMAIL_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const closedEmailQueueItems = emailQueueItems.filter((item) => EMAIL_CLOSED_STATUSES.includes((item.status || '').toUpperCase()))
  const pendingVehicleQueueItems = vehicleQueueItems.filter((item) => VEHICLE_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const closedVehicleQueueItems = vehicleQueueItems.filter((item) => VEHICLE_CLOSED_STATUSES.includes((item.status || '').toUpperCase()))
  const pendingIdentityQueueItems = identityQueueItems.filter((item) => IDENTITY_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const closedIdentityQueueItems = identityQueueItems.filter((item) => IDENTITY_CLOSED_STATUSES.includes((item.status || '').toUpperCase()))
  const pendingUndertakingQueueItems = undertakingQueueItems.filter((item) => UNDERTAKING_PENDING_STATUSES.includes((item.status || '').toUpperCase()))
  const closedUndertakingQueueItems = undertakingQueueItems.filter((item) => UNDERTAKING_CLOSED_STATUSES.includes((item.status || '').toUpperCase()))
  const actionablePendingEmailQueueItems = pendingEmailQueueItems.filter((item) => item.can_take_action !== false)
  const actionablePendingIdentityQueueItems = pendingIdentityQueueItems.filter((item) => item.can_take_action !== false)
  const actionablePendingVehicleQueueItems = pendingVehicleQueueItems.filter((item) => item.can_take_action !== false)

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

  const getSelectedIds = (selection: Record<string, boolean>) => Object.keys(selection).filter((id) => selection[id])

  const fetchStakeholderEmailQueue = async () => {
    if (!canReviewEmailQueue) return

    setEmailQueueLoading(true)
    setEmailQueueError(null)

    try {
      let token = await resolveAccessToken()
      if (!token) {
        router.push('/login')
        return
      }

      let response = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch('/api/admin/overview', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }

      if (!response.ok) {
        throw new Error(`Queue fetch failed with status ${response.status}`)
      }

      const payload = await response.json()
      setEmailQueueItems(Array.isArray(payload?.queues?.latestPendingEmailForms) ? payload.queues.latestPendingEmailForms : [])
      setSelectedEmailItems({})
    } catch (error) {
      console.error('Error loading stakeholder email queue:', error)
      setEmailQueueError('Unable to load email approval queue right now.')
    } finally {
      setEmailQueueLoading(false)
    }
  }

  const handleToggleEmailQueue = async () => {
    const next = !showEmailQueue
    setShowEmailQueue(next)
    if (next) setEmailQueueTab('pending')

    if (next) {
      await fetchStakeholderEmailQueue()
    }
  }

  const fetchStakeholderIdentityQueue = async () => {
    if (!canReviewIdentityQueue) return

    setIdentityQueueLoading(true)
    setIdentityQueueError(null)

    try {
      let token = await resolveAccessToken()
      if (!token) {
        router.push('/login')
        return
      }

      let response = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch('/api/admin/overview', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }

      if (!response.ok) {
        throw new Error(`Queue fetch failed with status ${response.status}`)
      }

      const payload = await response.json()
      setIdentityQueueItems(Array.isArray(payload?.queues?.latestPendingIdentityForms) ? payload.queues.latestPendingIdentityForms : [])
      setSelectedIdentityItems({})
    } catch (error) {
      console.error('Error loading stakeholder identity queue:', error)
      setIdentityQueueError('Unable to load identity approval queue right now.')
    } finally {
      setIdentityQueueLoading(false)
    }
  }

  const handleToggleIdentityQueue = async () => {
    const next = !showIdentityQueue
    setShowIdentityQueue(next)
    if (next) setIdentityQueueTab('pending')

    if (next) {
      await fetchStakeholderIdentityQueue()
    }
  }

  const fetchStakeholderVehicleQueue = async () => {
    if (!canReviewVehicleQueue) return

    setVehicleQueueLoading(true)
    setVehicleQueueError(null)

    try {
      let token = await resolveAccessToken()
      if (!token) {
        router.push('/login')
        return
      }

      let response = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch('/api/admin/overview', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }

      if (!response.ok) {
        throw new Error(`Queue fetch failed with status ${response.status}`)
      }

      const payload = await response.json()
      setVehicleQueueItems(Array.isArray(payload?.queues?.latestPendingVehicleForms) ? payload.queues.latestPendingVehicleForms : [])
      setSelectedVehicleItems({})
    } catch (error) {
      console.error('Error loading stakeholder vehicle queue:', error)
      setVehicleQueueError('Unable to load vehicle approval queue right now.')
    } finally {
      setVehicleQueueLoading(false)
    }
  }

  const handleToggleVehicleQueue = async () => {
    const next = !showVehicleQueue
    setShowVehicleQueue(next)
    if (next) setVehicleQueueTab('pending')

    if (next) {
      await fetchStakeholderVehicleQueue()
    }
  }

  const handleVehicleDecision = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    const remarks = (vehicleDecisionDrafts[requestId] || '').trim()
    if (!remarks) {
      alert('Please enter remark before processing vehicle sticker request.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setProcessingVehicleId(requestId)

    try {
      let response = await fetch(`/api/admin/vehicle-stickers/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remarks }),
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch(`/api/admin/vehicle-stickers/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, remarks }),
        })
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Decision failed with status ${response.status}`)
      }

      setVehicleDecisionDrafts((prev) => {
        const next = { ...prev }
        delete next[requestId]
        return next
      })

      await fetchStakeholderVehicleQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process vehicle sticker request')
    } finally {
      setProcessingVehicleId(null)
    }
  }

  const handleIdentityDecision = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    const remarks = (identityDecisionDrafts[requestId] || '').trim()
    if (!remarks) {
      alert('Please enter remark before processing identity card request.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setProcessingIdentityId(requestId)

    try {
      let response = await fetch(`/api/admin/identity-card/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remarks }),
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch(`/api/admin/identity-card/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, remarks }),
        })
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Decision failed with status ${response.status}`)
      }

      setIdentityDecisionDrafts((prev) => {
        const next = { ...prev }
        delete next[requestId]
        return next
      })

      await fetchStakeholderIdentityQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process identity card request')
    } finally {
      setProcessingIdentityId(null)
    }
  }

  const handleApproveEmailRequest = async (requestId: string) => {
    const draft = ensureEmailDraft(requestId)

    if (!draft.remarks.trim()) {
      alert('Please enter remark before approving.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setApprovingEmailId(requestId)

    try {
      let response = await fetch(`/api/admin/email-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'APPROVE',
          remarks: draft.remarks,
        }),
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch(`/api/admin/email-requests/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'APPROVE',
            remarks: draft.remarks,
          }),
        })
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Approval failed with status ${response.status}`)
      }

      await fetchStakeholderEmailQueue()
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

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setApprovingEmailId(requestId)

    try {
      let response = await fetch(`/api/admin/email-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'REJECT',
          remarks: draft.remarks,
        }),
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch(`/api/admin/email-requests/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'REJECT',
            remarks: draft.remarks,
          }),
        })
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Rejection failed with status ${response.status}`)
      }

      await fetchStakeholderEmailQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reject email request')
    } finally {
      setApprovingEmailId(null)
    }
  }

  const fetchStakeholderUndertakingQueue = async () => {
    if (!canReviewUndertakingQueue) return

    setUndertakingQueueLoading(true)
    setUndertakingQueueError(null)

    try {
      let token = await resolveAccessToken()
      if (!token) {
        router.push('/login')
        return
      }

      let response = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch('/api/admin/overview', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }

      if (!response.ok) {
        throw new Error(`Queue fetch failed with status ${response.status}`)
      }

      const payload = await response.json()
      setUndertakingQueueItems(Array.isArray(payload?.queues?.latestPendingUndertakingForms) ? payload.queues.latestPendingUndertakingForms : [])
      setSelectedUndertakingItems({})
    } catch (error) {
      console.error('Error loading stakeholder undertaking queue:', error)
      setUndertakingQueueError('Unable to load undertaking approval queue right now.')
    } finally {
      setUndertakingQueueLoading(false)
    }
  }

  const handleToggleUndertakingQueue = async () => {
    const next = !showUndertakingQueue
    setShowUndertakingQueue(next)
    if (next) setUndertakingQueueTab('pending')

    if (next) {
      await fetchStakeholderUndertakingQueue()
    }
  }

  const handleUndertakingDecision = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    const remarks = (undertakingRemarks[requestId] || '').trim()
    if (!remarks) {
      alert('Please enter remark before processing undertaking request.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setProcessingUndertakingId(requestId)

    try {
      let response = await fetch(`/api/admin/undertaking/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remarks }),
      })

      if (response.status === 401) {
        token = await resolveAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        response = await fetch(`/api/admin/undertaking/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, remarks }),
        })
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Decision failed with status ${response.status}`)
      }

      setUndertakingRemarks((prev) => {
        const next = { ...prev }
        delete next[requestId]
        return next
      })

      await fetchStakeholderUndertakingQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process undertaking request')
    } finally {
      setProcessingUndertakingId(null)
    }
  }

  const processBulkEmailDecision = async (action: 'APPROVE' | 'REJECT') => {
    const selectedIds = getSelectedIds(selectedEmailItems)
    if (selectedIds.length === 0) {
      alert('Please select at least one email request.')
      return
    }
    if (!bulkEmailRemark.trim()) {
      alert('Please enter one remark for bulk email decision.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setBulkEmailProcessing(true)
    try {
      for (const requestId of selectedIds) {
        let response = await fetch(`/api/admin/email-requests/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, remarks: bulkEmailRemark.trim() }),
        })

        if (response.status === 401) {
          token = await resolveAccessToken()
          if (!token) {
            router.push('/login')
            return
          }
          response = await fetch(`/api/admin/email-requests/${requestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, remarks: bulkEmailRemark.trim() }),
          })
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || `Bulk email decision failed with status ${response.status}`)
        }
      }

      setBulkEmailRemark('')
      setSelectedEmailItems({})
      await fetchStakeholderEmailQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process bulk email decisions')
    } finally {
      setBulkEmailProcessing(false)
    }
  }

  const processBulkIdentityDecision = async (action: 'APPROVE' | 'REJECT') => {
    const selectedIds = getSelectedIds(selectedIdentityItems)
    if (selectedIds.length === 0) {
      alert('Please select at least one identity card request.')
      return
    }
    if (!bulkIdentityRemark.trim()) {
      alert('Please enter one remark for bulk identity decision.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setBulkIdentityProcessing(true)
    try {
      for (const requestId of selectedIds) {
        let response = await fetch(`/api/admin/identity-card/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, remarks: bulkIdentityRemark.trim() }),
        })

        if (response.status === 401) {
          token = await resolveAccessToken()
          if (!token) {
            router.push('/login')
            return
          }
          response = await fetch(`/api/admin/identity-card/${requestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, remarks: bulkIdentityRemark.trim() }),
          })
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || `Bulk identity decision failed with status ${response.status}`)
        }
      }

      setBulkIdentityRemark('')
      setSelectedIdentityItems({})
      await fetchStakeholderIdentityQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process bulk identity decisions')
    } finally {
      setBulkIdentityProcessing(false)
    }
  }

  const processBulkVehicleDecision = async (action: 'APPROVE' | 'REJECT') => {
    const selectedIds = getSelectedIds(selectedVehicleItems)
    if (selectedIds.length === 0) {
      alert('Please select at least one vehicle request.')
      return
    }
    if (!bulkVehicleRemark.trim()) {
      alert('Please enter one remark for bulk vehicle decision.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setBulkVehicleProcessing(true)
    try {
      for (const requestId of selectedIds) {
        let response = await fetch(`/api/admin/vehicle-stickers/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, remarks: bulkVehicleRemark.trim() }),
        })

        if (response.status === 401) {
          token = await resolveAccessToken()
          if (!token) {
            router.push('/login')
            return
          }
          response = await fetch(`/api/admin/vehicle-stickers/${requestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, remarks: bulkVehicleRemark.trim() }),
          })
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || `Bulk vehicle decision failed with status ${response.status}`)
        }
      }

      setBulkVehicleRemark('')
      setSelectedVehicleItems({})
      await fetchStakeholderVehicleQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process bulk vehicle decisions')
    } finally {
      setBulkVehicleProcessing(false)
    }
  }

  const processBulkUndertakingDecision = async (action: 'ACCEPT' | 'REJECT') => {
    const selectedIds = getSelectedIds(selectedUndertakingItems)
    if (selectedIds.length === 0) {
      alert('Please select at least one undertaking request.')
      return
    }
    if (!bulkUndertakingRemark.trim()) {
      alert('Please enter one remark for bulk undertaking decision.')
      return
    }

    let token = await resolveAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    setBulkUndertakingProcessing(true)
    try {
      for (const requestId of selectedIds) {
        let response = await fetch(`/api/admin/undertaking/${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, remarks: bulkUndertakingRemark.trim() }),
        })

        if (response.status === 401) {
          token = await resolveAccessToken()
          if (!token) {
            router.push('/login')
            return
          }
          response = await fetch(`/api/admin/undertaking/${requestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action, remarks: bulkUndertakingRemark.trim() }),
          })
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || `Bulk undertaking decision failed with status ${response.status}`)
        }
      }

      setBulkUndertakingRemark('')
      setSelectedUndertakingItems({})
      await fetchStakeholderUndertakingQueue()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process bulk undertaking decisions')
    } finally {
      setBulkUndertakingProcessing(false)
    }
  }

  const renderEmailRequestDetails = (item: any) => (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Applicant Name</p><p className="font-medium text-gray-900">{item.applicant_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Title</p><p className="font-medium text-gray-900">{item.applicant_title || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Initials</p><p className="font-medium text-gray-900">{item.applicant_initials || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Gender</p><p className="font-medium text-gray-900">{item.gender || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Permanent Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.permanent_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Organisation ID</p><p className="font-medium text-gray-900">{item.organisation_id || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Engagement</p><p className="font-medium text-gray-900">{item.nature_of_engagement || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Role</p><p className="font-medium text-gray-900">{item.role || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Department/Section</p><p className="font-medium text-gray-900">{item.department_section || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Project Name</p><p className="font-medium text-gray-900">{item.project_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Joining Date</p><p className="font-medium text-gray-900">{item.joining_date ? new Date(item.joining_date).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Anticipated End</p><p className="font-medium text-gray-900">{item.anticipated_end_date ? new Date(item.anticipated_end_date).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Reporting Officer</p><p className="font-medium text-gray-900">{item.reporting_officer_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Reporting Officer Email</p><p className="font-medium text-gray-900">{item.reporting_officer_email || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Mobile</p><p className="font-medium text-gray-900">{item.mobile_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Alternate Email</p><p className="font-medium text-gray-900">{item.alternate_email || '-'}</p></div>
    </div>
  )

  const renderVehicleDetails = (item: any) => (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Applicant Name</p><p className="font-medium text-gray-900">{item.applicant_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Applicant Type</p><p className="font-medium text-gray-900">{item.applicant_type || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Applicant Identifier</p><p className="font-medium text-gray-900">{item.applicant_identifier || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Designation</p><p className="font-medium text-gray-900">{item.designation || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Department/Section</p><p className="font-medium text-gray-900">{item.department_section || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Phone Number</p><p className="font-medium text-gray-900">{item.phone_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Email</p><p className="font-medium text-gray-900">{item.email || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Driving License Number</p><p className="font-medium text-gray-900">{item.driving_license_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Driving License Valid Upto</p><p className="font-medium text-gray-900">{item.driving_license_valid_upto ? new Date(item.driving_license_valid_upto).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.address || '-'}</p></div>
    </div>
  )

  const renderIdentityDetails = (item: any) => (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Designation</p><p className="font-medium text-gray-900">{item.designation || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Employment Type</p><p className="font-medium text-gray-900">{item.employment_type || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Contract Upto</p><p className="font-medium text-gray-900">{item.contract_upto ? new Date(item.contract_upto).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Department/Section</p><p className="font-medium text-gray-900">{item.department_section || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Father/Husband Name</p><p className="font-medium text-gray-900">{item.father_or_husband_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Date of Birth</p><p className="font-medium text-gray-900">{item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Email Address</p><p className="font-medium text-gray-900">{item.email_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Date of Joining</p><p className="font-medium text-gray-900">{item.date_of_joining ? new Date(item.date_of_joining).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Blood Group</p><p className="font-medium text-gray-900">{item.blood_group || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Office Phone</p><p className="font-medium text-gray-900">{item.office_phone || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Mobile Number</p><p className="font-medium text-gray-900">{item.mobile_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Request Type</p><p className="font-medium text-gray-900">{item.request_type || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Present Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.present_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Renewal Reason</p><p className="font-medium text-gray-900">{item.renewal_reason || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Identity Card Type</p><p className="font-medium text-gray-900">{item.identity_card_type || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Card Number</p><p className="font-medium text-gray-900">{item.card_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Card Issued Date</p><p className="font-medium text-gray-900">{item.card_issued_date ? new Date(item.card_issued_date).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Photo Document URL</p><p className="font-medium text-gray-900 break-all">{item.photo_document_url || '-'}</p></div>
    </div>
  )

  const renderUndertakingDetails = (item: any) => (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Student Name</p><p className="font-medium text-gray-900">{item.student_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Entry Number</p><p className="font-medium text-gray-900">{item.entry_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Course</p><p className="font-medium text-gray-900">{item.course_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Department</p><p className="font-medium text-gray-900">{item.department_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Hostel Room</p><p className="font-medium text-gray-900">{item.hostel_room_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Email</p><p className="font-medium text-gray-900">{item.email_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Date of Joining</p><p className="font-medium text-gray-900">{item.date_of_joining ? new Date(item.date_of_joining).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">HEF</p><p className="font-medium text-gray-900">{item.hef_amount ?? '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Mess Security Fee</p><p className="font-medium text-gray-900">{item.mess_security_fee ?? '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Mess Admission Fee</p><p className="font-medium text-gray-900">{item.mess_admission_fee ?? '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Mess Charges</p><p className="font-medium text-gray-900">{item.mess_charges ?? '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Blood Group</p><p className="font-medium text-gray-900">{item.blood_group || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Category</p><p className="font-medium text-gray-900">{item.category || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Emergency Contact</p><p className="font-medium text-gray-900">{item.emergency_contact_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Parent Office Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.parent_office_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Parent Residence Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.parent_residence_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Parent Mobile</p><p className="font-medium text-gray-900">{item.parent_mobile_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Parent Telephone</p><p className="font-medium text-gray-900">{item.parent_telephone_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Parent Email</p><p className="font-medium text-gray-900">{item.parent_email_id || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Local Guardian Office Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.local_guardian_office_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Local Guardian Residence Address</p><p className="font-medium text-gray-900 whitespace-pre-wrap">{item.local_guardian_residence_address || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Local Guardian Mobile</p><p className="font-medium text-gray-900">{item.local_guardian_mobile_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Local Guardian Telephone</p><p className="font-medium text-gray-900">{item.local_guardian_telephone_number || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs text-gray-500">Local Guardian Email</p><p className="font-medium text-gray-900">{item.local_guardian_email_id || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Declaration Accepted</p><p className="font-medium text-gray-900">{item.declaration_accepted ? 'Yes' : 'No'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Form Date</p><p className="font-medium text-gray-900">{item.form_date ? new Date(item.form_date).toLocaleDateString() : '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Student Signature</p><p className="font-medium text-gray-900">{item.student_signature_name || '-'}</p></div>
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2"><p className="text-xs text-gray-500">Parent Signature</p><p className="font-medium text-gray-900">{item.parent_signature_name || '-'}</p></div>
    </div>
  )

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'SUBMITTED': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_APPROVAL': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_LEVEL_1': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_LEVEL_2': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_LEVEL_3': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_OFFICER': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_SUPERVISOR': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_HOD': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_HOSTEL_WARDEN': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_AFFAIRS': 'bg-amber-50 text-amber-700 border border-amber-200',
      'PENDING_SECURITY': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED_HOD': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED_DIRECTOR': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED_BY_SUPERVISOR': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED_BY_HOD': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED_BY_HOSTEL_WARDEN': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED_BY_AFFAIRS': 'bg-amber-50 text-amber-700 border border-amber-200',
      'APPROVED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'COMPLETED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'ISSUED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'ACCEPTED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'STICKER_ISSUED': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'REJECTED': 'bg-red-50 text-red-700 border border-red-200',
      'CANCELLED': 'bg-red-50 text-red-700 border border-red-200',
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

        {canReviewEmailQueue && (
          <div className="mb-8 rounded-xl section-glass border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Email Approval Queue Access</p>
              <p className="text-xs text-amber-800 mt-1">
                Your role can review and approve pending email ID requests.
              </p>
            </div>
            <button
              onClick={handleToggleEmailQueue}
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition"
            >
              {showEmailQueue ? 'Hide Email Approval Queue' : 'Open Email Approval Queue'}
            </button>
          </div>
        )}

        {canReviewIdentityQueue && (
          <div className="mb-8 rounded-xl section-glass border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Identity Card Queue Access</p>
              <p className="text-xs text-amber-800 mt-1">
                Your role can review identity card requests with full submitted details.
              </p>
            </div>
            <button
              onClick={handleToggleIdentityQueue}
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition"
            >
              {showIdentityQueue ? 'Hide Identity Queue' : 'Open Identity Queue'}
            </button>
          </div>
        )}

        {canReviewVehicleQueue && (
          <div className="mb-8 rounded-xl section-glass border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Vehicle Sticker Queue Access</p>
              <p className="text-xs text-amber-800 mt-1">
                Your role can review vehicle sticker requests by workflow stage.
              </p>
            </div>
            <button
              onClick={handleToggleVehicleQueue}
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition"
            >
              {showVehicleQueue ? 'Hide Vehicle Queue' : 'Open Vehicle Queue'}
            </button>
          </div>
        )}

        {canReviewUndertakingQueue && (
          <div className="mb-8 rounded-xl section-glass border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Undertaking Queue Access</p>
              <p className="text-xs text-amber-800 mt-1">
                Your role can review and process undertaking requests.
              </p>
            </div>
            <button
              onClick={handleToggleUndertakingQueue}
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition"
            >
              {showUndertakingQueue ? 'Hide Undertaking Queue' : 'Open Undertaking Queue'}
            </button>
          </div>
        )}

        {canReviewEmailQueue && showEmailQueue && (
          <section className="mb-8 pop-panel section-glass rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Pending Email Form Queue</h2>

            {emailQueueLoading && <p className="text-sm text-gray-500">Loading queue...</p>}
            {!emailQueueLoading && emailQueueError && <p className="text-sm text-red-600">{emailQueueError}</p>}
            {!emailQueueLoading && !emailQueueError && emailQueueItems.length === 0 && (
              <p className="text-sm text-gray-500">No email requests found.</p>
            )}

            {!emailQueueLoading && !emailQueueError && emailQueueItems.length > 0 && (
              <div>
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
                    Completed ({closedEmailQueueItems.length})
                  </button>
                </div>

                {emailQueueTab === 'pending' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    {pendingEmailQueueItems.length === 0 && <p className="text-sm text-gray-500">No pending requests.</p>}

                    {pendingEmailQueueItems.length > 0 && (
                      <>
                        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = actionablePendingEmailQueueItems.length > 0 && actionablePendingEmailQueueItems.every((item) => selectedEmailItems[item.id])
                                if (allSelected) {
                                  setSelectedEmailItems({})
                                } else {
                                  setSelectedEmailItems(Object.fromEntries(actionablePendingEmailQueueItems.map((item) => [item.id, true])))
                                }
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Select All
                            </button>
                            <span className="text-xs text-gray-600">Selected: {getSelectedIds(selectedEmailItems).length}</span>
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Bulk Remark *</label>
                            <textarea
                              value={bulkEmailRemark}
                              onChange={(e) => setBulkEmailRemark(e.target.value)}
                              rows={2}
                              placeholder="One common remark for all selected email requests"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => processBulkEmailDecision('APPROVE')}
                              disabled={bulkEmailProcessing}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {bulkEmailProcessing ? 'Processing...' : 'Approve All Selected'}
                            </button>
                            <button
                              type="button"
                              onClick={() => processBulkEmailDecision('REJECT')}
                              disabled={bulkEmailProcessing}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {bulkEmailProcessing ? 'Processing...' : 'Reject All Selected'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {pendingEmailQueueItems.map((item) => (
                          <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedEmailItems[item.id])}
                                  disabled={item.can_take_action === false}
                                  onChange={(e) => setSelectedEmailItems((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                                />
                                <div>
                                <p className="text-gray-900 font-medium text-sm">{item.applicant_name || 'Applicant'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Employee Code / Org ID: {item.organisation_id || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {item.status}
                              </span>
                            </div>

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

                            {expandedEmailDetails[item.id] && (
                              <>
                                {renderEmailRequestDetails(item)}

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

                                {(item.approval_remark || item.approval_processed_by_name) && (
                                  <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                    <p className="text-xs text-gray-500">Latest Decision</p>
                                    <p className="font-medium text-gray-900">{item.approval_remark || '-'}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      By: {item.approval_processed_by_name || '-'} {item.approval_processed_at ? `on ${new Date(item.approval_processed_at).toLocaleString()}` : ''}
                                    </p>
                                  </div>
                                )}

                                {item.can_take_action ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      onClick={() => handleApproveEmailRequest(item.id)}
                                      disabled={approvingEmailId === item.id}
                                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {approvingEmailId === item.id ? 'Processing...' : 'Accept'}
                                    </button>
                                    <button
                                      onClick={() => handleRejectEmailRequest(item.id)}
                                      disabled={approvingEmailId === item.id}
                                      className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {approvingEmailId === item.id ? 'Processing...' : 'Reject'}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="mt-4 text-sm text-gray-600">Awaiting action by another approval level.</p>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {emailQueueTab === 'completed' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    {closedEmailQueueItems.length === 0 && <p className="text-sm text-gray-500">No closed requests yet.</p>}

                    {closedEmailQueueItems.length > 0 && (
                      <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {closedEmailQueueItems.map((item) => (
                          <div key={item.id} className={`rounded-xl section-glass border p-4 ${
                            ['REJECTED','CANCELLED'].includes((item.status||'').toUpperCase())
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-center gap-3">
                              <div>
                                <p className="text-gray-900 font-medium text-sm">{item.applicant_name || 'Applicant'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Employee Code / Org ID: {item.organisation_id || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                                {item.status}
                              </span>
                            </div>

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

                            {expandedEmailDetails[item.id] && (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                                  <p className="text-xs text-gray-500">Assigned Email ID</p>
                                  <p className="font-medium text-gray-900">{item.assigned_email_id || '-'}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                                  <p className="text-xs text-gray-500">Approved By</p>
                                  <p className="font-medium text-gray-900">{item.approval_processed_by_name || '-'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {canReviewIdentityQueue && showIdentityQueue && (
          <section className="mb-8 pop-panel section-glass rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Identity Card Queue</h2>

            {identityQueueLoading && <p className="text-sm text-gray-500">Loading queue...</p>}
            {!identityQueueLoading && identityQueueError && <p className="text-sm text-red-600">{identityQueueError}</p>}
            {!identityQueueLoading && !identityQueueError && identityQueueItems.length === 0 && (
              <p className="text-sm text-gray-500">No identity card requests found.</p>
            )}

            {!identityQueueLoading && !identityQueueError && identityQueueItems.length > 0 && (
              <div>
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
                    Completed ({closedIdentityQueueItems.length})
                  </button>
                </div>

                {identityQueueTab === 'pending' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    {pendingIdentityQueueItems.length === 0 && <p className="text-sm text-gray-500">No pending requests.</p>}

                    {pendingIdentityQueueItems.length > 0 && (
                      <>
                        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = actionablePendingIdentityQueueItems.length > 0 && actionablePendingIdentityQueueItems.every((item) => selectedIdentityItems[item.id])
                                if (allSelected) {
                                  setSelectedIdentityItems({})
                                } else {
                                  setSelectedIdentityItems(Object.fromEntries(actionablePendingIdentityQueueItems.map((item) => [item.id, true])))
                                }
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Select All
                            </button>
                            <span className="text-xs text-gray-600">Selected: {getSelectedIds(selectedIdentityItems).length}</span>
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Bulk Remark *</label>
                            <textarea
                              value={bulkIdentityRemark}
                              onChange={(e) => setBulkIdentityRemark(e.target.value)}
                              rows={2}
                              placeholder="One common remark for all selected identity requests"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => processBulkIdentityDecision('APPROVE')}
                              disabled={bulkIdentityProcessing}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {bulkIdentityProcessing ? 'Processing...' : 'Approve All Selected'}
                            </button>
                            <button
                              type="button"
                              onClick={() => processBulkIdentityDecision('REJECT')}
                              disabled={bulkIdentityProcessing}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {bulkIdentityProcessing ? 'Processing...' : 'Reject All Selected'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {pendingIdentityQueueItems.map((item) => (
                          <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedIdentityItems[item.id])}
                                  disabled={item.can_take_action === false}
                                  onChange={(e) => setSelectedIdentityItems((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                                />
                                <div>
                                <p className="text-gray-900 font-medium text-sm">{item.applicant_name || 'Applicant'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Employee Code: {item.employee_code || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {item.status}
                              </span>
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

                            {expandedIdentityDetails[item.id] && renderIdentityDetails(item)}

                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                              {item.stage_message || 'Approval is in progress.'}
                            </div>

                            {(item.approval_remark || item.approval_processed_by_name) && (
                              <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                <p className="text-xs text-gray-500">Latest Decision</p>
                                <p className="font-medium text-gray-900">{item.approval_remark || '-'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  By: {item.approval_processed_by_name || '-'} {item.approval_processed_at ? `on ${new Date(item.approval_processed_at).toLocaleString()}` : ''}
                                </p>
                              </div>
                            )}

                            {item.can_take_action && (
                              <div className="mt-4">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Remark *</label>
                                <textarea
                                  value={identityDecisionDrafts[item.id] || ''}
                                  onChange={(e) => setIdentityDecisionDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  rows={3}
                                  placeholder="Write decision remark visible to user"
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                                />
                              </div>
                            )}

                            {item.can_take_action ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleIdentityDecision(item.id, 'APPROVE')}
                                  disabled={processingIdentityId === item.id}
                                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
                                >
                                  {processingIdentityId === item.id ? 'Processing...' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleIdentityDecision(item.id, 'REJECT')}
                                  disabled={processingIdentityId === item.id}
                                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
                                >
                                  {processingIdentityId === item.id ? 'Processing...' : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              <p className="mt-4 text-sm text-gray-600">Awaiting action by another approval stage.</p>
                            )}
                          </div>
                        ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {identityQueueTab === 'completed' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    {closedIdentityQueueItems.length === 0 && <p className="text-sm text-gray-500">No completed requests yet.</p>}

                    {closedIdentityQueueItems.length > 0 && (
                      <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {closedIdentityQueueItems.map((item) => (
                          <div key={item.id} className={`rounded-xl section-glass border p-4 ${
                            ['REJECTED','CANCELLED'].includes((item.status||'').toUpperCase())
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-center gap-3">
                              <div>
                                <p className="text-gray-900 font-medium text-sm">{item.applicant_name || 'Applicant'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Employee Code: {item.employee_code || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                                {item.status}
                              </span>
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

                            {expandedIdentityDetails[item.id] && renderIdentityDetails(item)}

                            <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                              <p className="text-xs text-gray-500">Workflow Stage</p>
                              <p className="font-medium text-gray-900">{item.stage_message || 'Completed'}</p>
                            </div>

                            {(item.approval_remark || item.approval_processed_by_name) && (
                              <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                <p className="text-xs text-gray-500">Latest Decision</p>
                                <p className="font-medium text-gray-900">{item.approval_remark || '-'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  By: {item.approval_processed_by_name || '-'} {item.approval_processed_at ? `on ${new Date(item.approval_processed_at).toLocaleString()}` : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {canReviewVehicleQueue && showVehicleQueue && (
          <section className="mb-8 pop-panel section-glass rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vehicle Sticker Queue</h2>

            {vehicleQueueLoading && <p className="text-sm text-gray-500">Loading queue...</p>}
            {!vehicleQueueLoading && vehicleQueueError && <p className="text-sm text-red-600">{vehicleQueueError}</p>}
            {!vehicleQueueLoading && !vehicleQueueError && vehicleQueueItems.length === 0 && (
              <p className="text-sm text-gray-500">No vehicle requests found.</p>
            )}

            {!vehicleQueueLoading && !vehicleQueueError && vehicleQueueItems.length > 0 && (
              <div>
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
                    Completed ({closedVehicleQueueItems.length})
                  </button>
                </div>

                {vehicleQueueTab === 'pending' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    {pendingVehicleQueueItems.length === 0 && <p className="text-sm text-gray-500">No pending requests.</p>}

                    {pendingVehicleQueueItems.length > 0 && (
                      <>
                        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = actionablePendingVehicleQueueItems.length > 0 && actionablePendingVehicleQueueItems.every((item) => selectedVehicleItems[item.id])
                                if (allSelected) {
                                  setSelectedVehicleItems({})
                                } else {
                                  setSelectedVehicleItems(Object.fromEntries(actionablePendingVehicleQueueItems.map((item) => [item.id, true])))
                                }
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Select All
                            </button>
                            <span className="text-xs text-gray-600">Selected: {getSelectedIds(selectedVehicleItems).length}</span>
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Bulk Remark *</label>
                            <textarea
                              value={bulkVehicleRemark}
                              onChange={(e) => setBulkVehicleRemark(e.target.value)}
                              rows={2}
                              placeholder="One common remark for all selected vehicle requests"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => processBulkVehicleDecision('APPROVE')}
                              disabled={bulkVehicleProcessing}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {bulkVehicleProcessing ? 'Processing...' : 'Approve All Selected'}
                            </button>
                            <button
                              type="button"
                              onClick={() => processBulkVehicleDecision('REJECT')}
                              disabled={bulkVehicleProcessing}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {bulkVehicleProcessing ? 'Processing...' : 'Reject All Selected'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {pendingVehicleQueueItems.map((item) => (
                          <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedVehicleItems[item.id])}
                                  disabled={item.can_take_action === false}
                                  onChange={(e) => setSelectedVehicleItems((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                                />
                                <div>
                                <p className="text-gray-900 font-medium text-sm">{item.applicant_name || 'Applicant'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Applicant Identifier: {item.applicant_identifier || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {item.status}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedVehicleDetails((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                            >
                              {expandedVehicleDetails[item.id] ? 'Hide full details' : 'Show full details'}
                              <svg
                                className={`h-4 w-4 transition-transform ${expandedVehicleDetails[item.id] ? 'rotate-180' : ''}`}
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {expandedVehicleDetails[item.id] && (
                              <>
                                {renderVehicleDetails(item)}

                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                  {item.stage_message || 'Approval is in progress.'}
                                </div>

                                {(item.approval_remark || item.approval_processed_by_name) && (
                                  <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                    <p className="text-xs text-gray-500">Latest Decision</p>
                                    <p className="font-medium text-gray-900">{item.approval_remark || '-'}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      By: {item.approval_processed_by_name || '-'} {item.approval_processed_at ? `on ${new Date(item.approval_processed_at).toLocaleString()}` : ''}
                                    </p>
                                  </div>
                                )}

                                {item.can_take_action && (
                                  <div className="mt-4">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Remark *</label>
                                    <textarea
                                      value={vehicleDecisionDrafts[item.id] || ''}
                                      onChange={(e) => setVehicleDecisionDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                      rows={3}
                                      placeholder="Write decision remark visible to user"
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                                    />
                                  </div>
                                )}

                                {item.can_take_action ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      onClick={() => handleVehicleDecision(item.id, 'APPROVE')}
                                      disabled={processingVehicleId === item.id}
                                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
                                    >
                                      {processingVehicleId === item.id ? 'Processing...' : 'Accept'}
                                    </button>
                                    <button
                                      onClick={() => handleVehicleDecision(item.id, 'REJECT')}
                                      disabled={processingVehicleId === item.id}
                                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
                                    >
                                      {processingVehicleId === item.id ? 'Processing...' : 'Reject'}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="mt-4 text-sm text-gray-600">Awaiting action by another approval stage.</p>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {vehicleQueueTab === 'completed' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    {closedVehicleQueueItems.length === 0 && <p className="text-sm text-gray-500">No closed requests yet.</p>}

                    {closedVehicleQueueItems.length > 0 && (
                      <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {closedVehicleQueueItems.map((item) => (
                          <div key={item.id} className={`rounded-xl section-glass border p-4 ${
                            ['REJECTED','CANCELLED'].includes((item.status||'').toUpperCase())
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-center gap-3">
                              <div>
                                <p className="text-gray-900 font-medium text-sm">{item.applicant_name || 'Applicant'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Applicant Identifier: {item.applicant_identifier || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                                {item.status}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedVehicleDetails((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                            >
                              {expandedVehicleDetails[item.id] ? 'Hide full details' : 'Show full details'}
                              <svg
                                className={`h-4 w-4 transition-transform ${expandedVehicleDetails[item.id] ? 'rotate-180' : ''}`}
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {expandedVehicleDetails[item.id] && (
                              <>
                                {renderVehicleDetails(item)}

                                <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                  <p className="text-xs text-gray-500">Workflow Stage</p>
                                  <p className="font-medium text-gray-900">{item.stage_message || 'Completed'}</p>
                                </div>

                                {(item.approval_remark || item.approval_processed_by_name) && (
                                  <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                    <p className="text-xs text-gray-500">Latest Decision</p>
                                    <p className="font-medium text-gray-900">{item.approval_remark || '-'}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      By: {item.approval_processed_by_name || '-'} {item.approval_processed_at ? `on ${new Date(item.approval_processed_at).toLocaleString()}` : ''}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {canReviewUndertakingQueue && showUndertakingQueue && (
          <section className="mb-8 pop-panel section-glass rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Undertaking Queue</h2>

            {undertakingQueueLoading && <p className="text-sm text-gray-500">Loading queue...</p>}
            {!undertakingQueueLoading && undertakingQueueError && <p className="text-sm text-red-600">{undertakingQueueError}</p>}
            {!undertakingQueueLoading && !undertakingQueueError && undertakingQueueItems.length === 0 && (
              <p className="text-sm text-gray-500">No undertaking requests found.</p>
            )}

            {!undertakingQueueLoading && !undertakingQueueError && undertakingQueueItems.length > 0 && (
              <div>
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
                    Completed ({closedUndertakingQueueItems.length})
                  </button>
                </div>

                {undertakingQueueTab === 'pending' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    {pendingUndertakingQueueItems.length === 0 && <p className="text-sm text-gray-500">No pending requests.</p>}

                    {pendingUndertakingQueueItems.length > 0 && (
                      <>
                        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allSelected = pendingUndertakingQueueItems.length > 0 && pendingUndertakingQueueItems.every((item) => selectedUndertakingItems[item.id])
                                if (allSelected) {
                                  setSelectedUndertakingItems({})
                                } else {
                                  setSelectedUndertakingItems(Object.fromEntries(pendingUndertakingQueueItems.map((item) => [item.id, true])))
                                }
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Select All
                            </button>
                            <span className="text-xs text-gray-600">Selected: {getSelectedIds(selectedUndertakingItems).length}</span>
                          </div>
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Bulk Remark *</label>
                            <textarea
                              value={bulkUndertakingRemark}
                              onChange={(e) => setBulkUndertakingRemark(e.target.value)}
                              rows={2}
                              placeholder="One common remark for all selected undertaking requests"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => processBulkUndertakingDecision('ACCEPT')}
                              disabled={bulkUndertakingProcessing}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {bulkUndertakingProcessing ? 'Processing...' : 'Approve All Selected'}
                            </button>
                            <button
                              type="button"
                              onClick={() => processBulkUndertakingDecision('REJECT')}
                              disabled={bulkUndertakingProcessing}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {bulkUndertakingProcessing ? 'Processing...' : 'Reject All Selected'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {pendingUndertakingQueueItems.map((item) => (
                          <div key={item.id} className="rounded-xl section-glass border border-gray-200 bg-gray-50 p-4">
                            <div className="flex justify-between items-center gap-3">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedUndertakingItems[item.id])}
                                  onChange={(e) => setSelectedUndertakingItems((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                                />
                                <div>
                                <p className="text-gray-900 font-medium text-sm">{item.student_name || 'Student'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Entry Number: {item.entry_number || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {item.status}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedUndertakingDetails((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                            >
                              {expandedUndertakingDetails[item.id] ? 'Hide full details' : 'Show full details'}
                              <svg
                                className={`h-4 w-4 transition-transform ${expandedUndertakingDetails[item.id] ? 'rotate-180' : ''}`}
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {expandedUndertakingDetails[item.id] && (
                              <>
                                {renderUndertakingDetails(item)}

                                <div className="mt-4">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Institute Admin Remark *</label>
                                  <textarea
                                    value={undertakingRemarks[item.id] || ''}
                                    onChange={(e) => setUndertakingRemarks((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    rows={3}
                                    placeholder="Write decision remark visible to user"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                                  />
                                </div>

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
                              </>
                            )}
                          </div>
                        ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {undertakingQueueTab === 'completed' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    {closedUndertakingQueueItems.length === 0 && <p className="text-sm text-gray-500">No closed requests yet.</p>}

                    {closedUndertakingQueueItems.length > 0 && (
                      <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
                        {closedUndertakingQueueItems.map((item) => (
                          <div key={item.id} className={`rounded-xl section-glass border p-4 ${
                            ['REJECTED','CANCELLED'].includes((item.status||'').toUpperCase())
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-center gap-3">
                              <div>
                                <p className="text-gray-900 font-medium text-sm">{item.student_name || 'Student'}</p>
                                <p className="text-xs text-gray-700 mt-0.5">Entry Number: {item.entry_number || '-'}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.submitted_date ? new Date(item.submitted_date).toLocaleString() : 'No date'}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusBadge(item.status)}`}>
                                {item.status}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedUndertakingDetails((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                            >
                              {expandedUndertakingDetails[item.id] ? 'Hide full details' : 'Show full details'}
                              <svg
                                className={`h-4 w-4 transition-transform ${expandedUndertakingDetails[item.id] ? 'rotate-180' : ''}`}
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {expandedUndertakingDetails[item.id] && (
                              <>
                                {renderUndertakingDetails(item)}
                                <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                                  <p className="text-xs text-gray-500">Remark</p>
                                  <p className="font-medium text-gray-900">{item.reviewer_remarks || '-'}</p>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Stats */}
        {!isStakeholderOnly && (
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
        )}

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
        {!isStakeholderOnly && (
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
        )}
      </div>
    </main>
  )
}
