"use client"

import { useAuth } from '@/app/context/AuthContext'
import { isInstituteEmail } from '@/lib/access'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import HostelForm from '@/app/components/forms/HostelForm'

export default function HostelPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !isInstituteEmail(user.email)) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) return null
  if (user && !isInstituteEmail(user.email)) return null

  return <HostelForm />
}
