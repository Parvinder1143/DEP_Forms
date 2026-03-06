'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { CSSProperties, useEffect } from 'react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
      </div>
    )
  }

  if (user) return null

  return (
    <main className="min-h-screen bg-transparent page-enter">
      {/* Hero Section */}
      <div className="relative bg-linear-to-b from-white via-gray-50 to-white border-b border-gray-100 pt-20 overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-emerald-300/40 blur-3xl pointer-events-none" />
        <div className="absolute top-10 -right-20 w-72 h-72 rounded-full bg-amber-300/32 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-violet-300/20 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="pop-panel rounded-3xl bg-white/90 backdrop-blur-xs border border-white/70 px-6 py-12 shadow-xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 shadow-md" style={{ background: 'linear-gradient(135deg, #111111 0%, #065f46 100%)' }}>
            <span className="text-white font-bold text-xl">IR</span>
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-black via-zinc-800 to-emerald-700 mb-4 leading-tight">
            Official Forms Portal
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            Streamlined institutional forms management for IIT Ropar
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="pop-cta btn-neon px-8 py-3 bg-black text-white font-semibold rounded-xl hover:bg-zinc-800 transition shadow-sm ring-1 ring-emerald-500/30">
              Sign In
            </Link>
            <Link href="/signup" className="pop-cta btn-neon px-8 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition border border-gray-200" style={{ ['--accent-a' as any]: '#d1d5db', ['--accent-b' as any]: '#86efac', ['--accent-c' as any]: '#c4b5fd' } as CSSProperties}>
              Create Account
            </Link>
          </div>
          </div>
        </div>
      </div>

      {/* Forms Overview */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Available Forms</h2>
            <p className="text-gray-500">Download institutional forms and submit them through official channels</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {/* Email ID Request */}
            <div className="group pop-card bg-white rounded-2xl p-6 hover:border-emerald-200 hover:shadow-md transition-all duration-200 flex flex-col" style={{ ['--accent-a' as any]: '#bbf7d0', ['--accent-b' as any]: '#6ee7b7', ['--accent-c' as any]: '#d9f99d' } as CSSProperties}>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl mb-5 group-hover:bg-emerald-100 transition">
                  <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Email ID</h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">Apply for institutional email account</p>
              </div>
              <a
                href="/forms/email-id-creation-form-new.pdf"
                download
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-gray-600 hover:text-emerald-700 text-xs font-semibold transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </a>
            </div>

            {/* Identity Card */}
            <div className="group pop-card bg-white rounded-2xl p-6 hover:border-violet-200 hover:shadow-md transition-all duration-200 flex flex-col" style={{ ['--accent-a' as any]: '#ddd6fe', ['--accent-b' as any]: '#c4b5fd', ['--accent-c' as any]: '#a5b4fc' } as CSSProperties}>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-center w-12 h-12 bg-violet-50 rounded-xl mb-5 group-hover:bg-violet-100 transition">
                  <svg className="w-6 h-6 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m0 0h5a2 2 0 002-2V8a2 2 0 00-2-2h-5m0 0V5a2 2 0 10-4 0v1m0 0a2 2 0 10 4 0" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Identity Card</h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">Get institutional ID card</p>
              </div>
              <a
                href="/forms/Identity Card Form.docx"
                download
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 text-gray-600 hover:text-violet-700 text-xs font-semibold transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </a>
            </div>

            {/* Vehicle Sticker */}
            <div className="group pop-card bg-white rounded-2xl p-6 hover:border-amber-200 hover:shadow-md transition-all duration-200 flex flex-col" style={{ ['--accent-a' as any]: '#fde68a', ['--accent-b' as any]: '#fcd34d', ['--accent-c' as any]: '#fdba74' } as CSSProperties}>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-center w-12 h-12 bg-amber-50 rounded-xl mb-5 group-hover:bg-amber-100 transition">
                  <svg className="w-6 h-6 text-amber-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 1a1 1 0 000 2h.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l4-8A1 1 0 0017 1H3z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Vehicle Sticker</h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">Obtain parking permit sticker</p>
              </div>
              <a
                href="/forms/Vehicle Sticker Form_Students.pdf"
                download
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 text-gray-600 hover:text-amber-700 text-xs font-semibold transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </a>
            </div>

            {/* Guest House */}
            <div className="group pop-card bg-white rounded-2xl p-6 hover:border-teal-200 hover:shadow-md transition-all duration-200 flex flex-col" style={{ ['--accent-a' as any]: '#99f6e4', ['--accent-b' as any]: '#5eead4', ['--accent-c' as any]: '#86efac' } as CSSProperties}>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-center w-12 h-12 bg-teal-50 rounded-xl mb-5 group-hover:bg-teal-100 transition">
                  <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 5h4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Guest House</h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">Reserve accommodation</p>
              </div>
              <a
                href="/forms/Revised-Guest-House-Reservation-Form w.e.f.01-04-2025.docx"
                download
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 text-gray-600 hover:text-teal-700 text-xs font-semibold transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </a>
            </div>

            {/* Undertaking */}
            <div className="group pop-card bg-white rounded-2xl p-6 hover:border-fuchsia-200 hover:shadow-md transition-all duration-200 flex flex-col" style={{ ['--accent-a' as any]: '#f5d0fe', ['--accent-b' as any]: '#f0abfc', ['--accent-c' as any]: '#c4b5fd' } as CSSProperties}>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-center w-12 h-12 bg-fuchsia-50 rounded-xl mb-5 group-hover:bg-fuchsia-100 transition">
                  <svg className="w-6 h-6 text-fuchsia-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Undertaking</h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">Submit formal declaration</p>
              </div>
              <a
                href="/forms/UNDERTAKING FORM (1)-aug-13.pdf"
                download
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-fuchsia-50 border border-gray-200 hover:border-fuchsia-200 text-gray-600 hover:text-fuchsia-700 text-xs font-semibold transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-gray-300 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-white mb-3">Indian Institute of Technology Ropar</h3>
              <p className="text-sm">Official forms portal for institutional requests and management</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Quick Links</h4>
              <ul className="text-sm space-y-1">
                <li><a href="#" className="hover:text-white transition">Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Contact IT</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Support</h4>
              <p className="text-sm">Email: it-support@iitrpr.ac.in</p>
              <p className="text-sm">Phone: +91-1881-055-055</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 IIT Ropar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

