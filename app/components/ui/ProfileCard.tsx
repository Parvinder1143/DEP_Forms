'use client'

import { useAuth } from '@/app/context/AuthContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Submission = {
  status?: string
}

export default function ProfileCard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    submissions: 0,
    approved: 0,
    pending: 0,
  })

  useEffect(() => {
    if (!user) return

    async function fetchStats() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (!token) {
          setStats({ submissions: 0, approved: 0, pending: 0 })
          return
        }

        const authHeaders = { Authorization: `Bearer ${token}` }

        const [email, vehicle, identity, guest, undertaking] = await Promise.all([
          fetch('/api/email-requests', { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch('/api/vehicle-stickers', { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch('/api/identity-card', { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch('/api/guest-house', { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch('/api/undertaking', { headers: authHeaders }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ])

        const all: Submission[] = [
          ...(Array.isArray(email) ? email : []),
          ...(Array.isArray(vehicle) ? vehicle : []),
          ...(Array.isArray(identity) ? identity : []),
          ...(Array.isArray(guest) ? guest : []),
          ...(Array.isArray(undertaking) ? undertaking : []),
        ]

        const approved = all.filter(
          (f) =>
            f.status?.includes('APPROVED') ||
            f.status === 'ISSUED' ||
            f.status === 'ACCEPTED' ||
            f.status === 'COMPLETED'
        ).length

        const pending = all.filter(
          (f) =>
            f.status === 'SUBMITTED' ||
            f.status === 'PENDING_OFFICER' ||
            f.status === 'PENDING_SUPERVISOR'
        ).length

        setStats({
          submissions: all.length,
          approved,
          pending,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    fetchStats()
  }, [user])

  const getInitials = (email?: string) => {
    if (!email) return 'U'
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const username = user?.email?.split('@')[0] || 'User'

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 pt-24 pb-12">
      <div className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center text-white text-2xl font-black shadow-sm">
            {getInitials(user?.email)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold electric-title leading-tight">{username}</h1>
            <p className="text-gray-500 text-sm mt-1">Institutional portal profile and submission overview</p>
            <p className="text-zinc-900 text-sm mt-1 font-medium">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Total Forms</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.submissions}</p>
          </div>
           <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
             <p className="text-emerald-700 text-xs uppercase tracking-wide font-medium">Approved</p>
             <p className="text-3xl font-bold text-emerald-700 mt-2">{stats.approved}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
            <p className="text-amber-700 text-xs uppercase tracking-wide font-medium">Pending</p>
            <p className="text-3xl font-bold text-amber-700 mt-2">{stats.pending}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard"
            className="text-center px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition text-sm"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/forms/email-request"
            className="text-center pop-cta btn-neon px-5 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-zinc-800 transition text-sm"
          >
            Start New Form
          </Link>
        </div>
      </div>
    </div>
  )
}
