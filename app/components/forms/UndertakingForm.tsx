'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function UndertakingForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    student_name: '',
    entry_number: '',
    course_name: '',
    department_name: '',
    hostel_room_number: '',
    email_address: user?.email || '',
    date_of_joining: '',
    hef_amount: '',
    mess_security_fee: '',
    mess_admission_fee: '',
    mess_charges: '',
    blood_group: '',
    category: '',
    emergency_contact_number: '',
    parent_office_address: '',
    parent_residence_address: '',
    parent_mobile_number: '',
    parent_telephone_number: '',
    parent_email_id: '',
    local_guardian_office_address: '',
    local_guardian_residence_address: '',
    local_guardian_mobile_number: '',
    local_guardian_telephone_number: '',
    local_guardian_email_id: '',
    declaration_accepted: false,
    form_date: new Date().toISOString().split('T')[0],
    student_signature_name: '',
    parent_signature_name: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type, value } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.declaration_accepted) {
      setError('Please accept the undertaking declaration before submitting.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/undertaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.error || 'Failed to submit form')
      }

      router.push('/dashboard?success=Undertaking form submitted successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-transparent pt-16 page-enter">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="back-link mb-6 transition">← Back</button>
        <div className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-8 py-5" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)', borderBottom: '1px solid #000000' }}>
            <h1 className="text-xl font-bold text-white">Hostel Information Cum Undertaking</h1>
            <p className="text-zinc-200 text-sm mt-0.5">Submit student hostel details and declaration</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Student Information */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Student Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Student *</label>
                  <input
                    type="text"
                    name="student_name"
                    value={formData.student_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Entry No *</label>
                  <input
                    type="text"
                    name="entry_number"
                    value={formData.entry_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Course *</label>
                  <input
                    type="text"
                    name="course_name"
                    value={formData.course_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Dept. *</label>
                  <input
                    type="text"
                    name="department_name"
                    value={formData.department_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hostel Room No. *</label>
                  <input
                    type="text"
                    name="hostel_room_number"
                    value={formData.hostel_room_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    name="email_address"
                    value={formData.email_address}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Joining *</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    value={formData.date_of_joining}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Fee and Basic Details */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Fee and Basic Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">HEF *</label>
                  <input type="number" step="0.01" name="hef_amount" value={formData.hef_amount} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mess Security (INR) *</label>
                  <input type="number" step="0.01" name="mess_security_fee" value={formData.mess_security_fee} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mess Admission Fee (INR) *</label>
                  <input type="number" step="0.01" name="mess_admission_fee" value={formData.mess_admission_fee} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mess Charges (INR) *</label>
                  <input type="number" step="0.01" name="mess_charges" value={formData.mess_charges} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Group *</label>
                  <input type="text" name="blood_group" value={formData.blood_group} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Emergency Contact No. *</label>
                  <input type="tel" name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>
            </div>

            {/* Parent Details */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Parents Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea name="parent_office_address" value={formData.parent_office_address} onChange={handleChange} required rows={3} placeholder="Parent Office Address" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <textarea name="parent_residence_address" value={formData.parent_residence_address} onChange={handleChange} required rows={3} placeholder="Parent Residence Address" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <input type="tel" name="parent_mobile_number" value={formData.parent_mobile_number} onChange={handleChange} required placeholder="Parent Mobile No." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <input type="tel" name="parent_telephone_number" value={formData.parent_telephone_number} onChange={handleChange} required placeholder="Parent Telephone No." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <input type="email" name="parent_email_id" value={formData.parent_email_id} onChange={handleChange} required placeholder="Parent Email ID" className="md:col-span-2 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
              </div>
            </div>

            {/* Local Guardian Details */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Local Guardian (If Any)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea name="local_guardian_office_address" value={formData.local_guardian_office_address} onChange={handleChange} rows={3} placeholder="Local Guardian Office Address" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <textarea name="local_guardian_residence_address" value={formData.local_guardian_residence_address} onChange={handleChange} rows={3} placeholder="Local Guardian Residence Address" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <input type="tel" name="local_guardian_mobile_number" value={formData.local_guardian_mobile_number} onChange={handleChange} placeholder="Local Guardian Mobile No." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <input type="tel" name="local_guardian_telephone_number" value={formData.local_guardian_telephone_number} onChange={handleChange} placeholder="Local Guardian Telephone No." className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                <input type="email" name="local_guardian_email_id" value={formData.local_guardian_email_id} onChange={handleChange} placeholder="Local Guardian Email ID" className="md:col-span-2 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
              </div>
            </div>

            {/* Declaration */}
            <div className="border-t border-gray-100 pt-5">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="declaration_accepted"
                    checked={formData.declaration_accepted}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 rounded border-gray-300 accent-emerald-600"
                  />
                  <span className="text-sm text-gray-700">
                    I hereby declare that I have read the hostel rules and will abide by all institute and hostel regulations.
                  </span>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
                  <input type="date" name="form_date" value={formData.form_date} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Student Signature (Name) *</label>
                  <input type="text" name="student_signature_name" value={formData.student_signature_name} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent Signature (Name) *</label>
                  <input type="text" name="parent_signature_name" value={formData.parent_signature_name} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 pop-cta btn-neon text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 transition text-sm" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}
              >
                {loading ? 'Submitting...' : 'Submit Undertaking'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
