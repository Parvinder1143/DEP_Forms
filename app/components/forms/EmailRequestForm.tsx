'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function EmailRequestForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    applicant_title: 'Mr.',
    applicant_initials: '',
    first_name: '',
    last_name: '',
    gender: 'Male',
    permanent_address: '',
    organisation_id: '',
    nature_of_engagement: 'Student',
    role: '',
    department_section: '',
    project_name: '',
    joining_date: '',
    anticipated_end_date: '',
    reporting_officer_name: '',
    reporting_officer_email: '',
    mobile_number: '',
    alternate_email: user?.email || '',
    consent_accepted: false,
  })

  const isTempOrProjectStaff =
    formData.nature_of_engagement === 'Tech staff'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData(prev => {
      const next = { ...prev, [name]: val }

      // Reset fields that are only relevant for temporary/project staff.
      if (name === 'nature_of_engagement' && value !== 'Tech staff') {
        next.project_name = ''
        next.joining_date = ''
        next.anticipated_end_date = ''
        next.reporting_officer_name = ''
        next.reporting_officer_email = ''
      }

      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.consent_accepted) {
      setError('Please provide consent before submitting the request.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/email-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.error || 'Failed to submit form')
      }

      router.push('/dashboard?message=Email request submitted successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-transparent pt-16 page-enter">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="back-link mb-6 transition">
          ← Back
        </button>
        <div className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)', borderBottom: '1px solid #000000' }}>
            <h1 className="text-xl font-bold text-white">Email ID Request</h1>
            <p className="text-zinc-200 text-sm mt-0.5">Apply for institutional email account</p>
          </div>
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Personal Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                  <select name="applicant_title" value={formData.applicant_title} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm">
                    <option value="Dr.">Dr.</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Initials *</label>
                  <input type="text" name="applicant_initials" value={formData.applicant_initials} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Permanent Address *</label>
                <textarea name="permanent_address" value={formData.permanent_address} onChange={handleChange} required rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm resize-none" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Employment Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Organisation ID *</label>
                  <input type="text" name="organisation_id" value={formData.organisation_id} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nature of Engagement *</label>
                  <select name="nature_of_engagement" value={formData.nature_of_engagement} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm">
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Non-staff">Non-staff</option>
                    <option value="Tech staff">Temp / Project Staff</option>
                    <option value="Administrative">Administration</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                  <input type="text" name="role" value={formData.role} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department / Section *</label>
                  <input type="text" name="department_section" value={formData.department_section} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>

              {isTempOrProjectStaff && (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                      <input type="text" name="project_name" value={formData.project_name} onChange={handleChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Joining Date *</label>
                      <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} required={isTempOrProjectStaff}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Anticipated End Date</label>
                      <input type="date" name="anticipated_end_date" value={formData.anticipated_end_date} onChange={handleChange}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Reporting Officer Name *</label>
                      <input type="text" name="reporting_officer_name" value={formData.reporting_officer_name} onChange={handleChange} required={isTempOrProjectStaff}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Reporting Officer Email *</label>
                      <input type="email" name="reporting_officer_email" value={formData.reporting_officer_email} onChange={handleChange} required={isTempOrProjectStaff}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Alternate Way to Communicate</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile No. *</label>
                  <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Alternate (non-IIT) Email</label>
                  <input type="email" name="alternate_email" value={formData.alternate_email} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <label className="flex items-start gap-3">
                <input type="checkbox" name="consent_accepted" checked={formData.consent_accepted} onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded border-gray-300 accent-emerald-600" />
                <span className="text-sm text-gray-700">
                  I have read and accept the email policy and understand my responsibilities as a user of email facility.
                </span>
              </label>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={loading}
                className="flex-1 pop-cta btn-neon text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 transition text-sm" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => router.back()}
                className="px-6 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition text-sm">
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">* Required fields</p>
          </form>
        </div>
      </div>
    </main>
  )
}
