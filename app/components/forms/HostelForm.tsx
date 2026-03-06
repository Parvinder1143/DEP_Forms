'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function HostelForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    entry_number: '',
    email: '',
    contact_number: '',
    gender: 'M',
    course: '',
    hostel_preference_1: '',
    hostel_preference_2: '',
    parent_name: '',
    parent_contact: '',
    guardian_name: '',
    guardian_contact: '',
    local_address: '',
    permanent_address: '',
    date_of_birth: '',
    blood_group: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    emergency_contact_relation: '',
    mess_preference: 'VEG',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/hostel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to submit form')
      }

      router.push('/dashboard?success=Hostel form submitted successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-transparent pt-16 page-enter">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="back-link mb-6 transition">
          ← Back
        </button>
        <div className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-8 py-5" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}>
            <h1 className="text-xl font-bold text-white">Hostel Information Form</h1>
            <p className="text-zinc-200 text-sm mt-0.5">Provide your residential details for hostel allocation</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Personal Information Section */}
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Entry Number *
                  </label>
                  <input
                    type="text"
                    name="entry_number"
                    value={formData.entry_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Course *
                  </label>
                  <input
                    type="text"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Student Name *
                </label>
                <input
                  type="text"
                  name="student_name"
                  value={formData.student_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    placeholder="e.g., O+, A-"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Hostel Preferences Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Hostel Preferences</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Preference 1
                  </label>
                  <input
                    type="text"
                    name="hostel_preference_1"
                    value={formData.hostel_preference_1}
                    onChange={handleChange}
                    placeholder="First choice hostel"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Preference 2
                  </label>
                  <input
                    type="text"
                    name="hostel_preference_2"
                    value={formData.hostel_preference_2}
                    onChange={handleChange}
                    placeholder="Second choice hostel"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Parent Information Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Parent Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Parent Name *
                  </label>
                  <input
                    type="text"
                    name="parent_name"
                    value={formData.parent_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Parent Contact *
                  </label>
                  <input
                    type="tel"
                    name="parent_contact"
                    value={formData.parent_contact}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Guardian Name *
                  </label>
                  <input
                    type="text"
                    name="guardian_name"
                    value={formData.guardian_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Guardian Contact *
                  </label>
                  <input
                    type="tel"
                    name="guardian_contact"
                    value={formData.guardian_contact}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Address Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Local Address *
                </label>
                <textarea
                  name="local_address"
                  value={formData.local_address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm resize-none"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Permanent Address *
                </label>
                <textarea
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm resize-none"
                />
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Emergency Contact</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Number *
                  </label>
                  <input
                    type="tel"
                    name="emergency_contact_number"
                    value={formData.emergency_contact_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Relation *
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_relation"
                    value={formData.emergency_contact_relation}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Father, Mother"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Meal Preference Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Meal Preference</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mess Preference *
                </label>
                <select
                  name="mess_preference"
                  value={formData.mess_preference}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-gray-900 bg-white text-sm"
                >
                  <option value="VEG">Vegetarian</option>
                  <option value="NON_VEG">Non-Vegetarian</option>
                  <option value="VEGAN">Vegan</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="border-t border-gray-100 pt-5 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 pop-cta btn-neon text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 text-sm" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}
              >
                {loading ? 'Submitting...' : 'Submit Form'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              * Required fields
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
