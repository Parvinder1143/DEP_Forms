'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await signUp(formData.email, formData.password)
      router.push('/login?message=Check your email to confirm your account')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-16 overflow-hidden page-enter" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f4f4f5 45%, #ecfdf3 75%, #f5f3ff 100%)' }}>
      <div className="pointer-events-none absolute -top-16 -left-10 w-72 h-72 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-56 h-56 rounded-full bg-amber-200/25 blur-3xl" />
      <div className="w-full max-w-md">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center rounded-2xl mb-4 shadow-md"
            style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}
          >
            <span className="text-white font-bold text-sm tracking-wide">IR</span>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-black via-zinc-800 to-emerald-700">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">IIT Ropar · Official Forms Portal</p>
        </div>

        {/* Card */}
        <div className="pop-panel bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/80 p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="you@iitrpr.ac.in"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 text-sm placeholder-gray-400 transition"
                style={{ outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.12)'; e.currentTarget.style.background = '#fff' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-14 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 text-sm transition"
                  style={{ outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.12)'; e.currentTarget.style.background = '#fff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold transition"
                  style={{ color: '#111111' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">At least 6 characters</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-14 border border-gray-200 rounded-xl text-gray-800 bg-gray-50 text-sm transition"
                  style={{ outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.12)'; e.currentTarget.style.background = '#fff' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold transition"
                  style={{ color: '#111111' }}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full pop-cta btn-neon text-white font-semibold py-2.5 rounded-xl transition text-sm shadow-sm disabled:opacity-60 mt-2"
              style={{ background: loading ? '#525252' : 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold transition" style={{ color: '#111111' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">© 2026 Indian Institute of Technology Ropar</p>
      </div>
    </div>
  )
}
