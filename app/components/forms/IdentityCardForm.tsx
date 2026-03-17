'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function IdentityCardForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    request_type: 'FRESH',
    employee_name: '',
    employee_code: '',
    designation: '',
    employment_type: 'PERMANENT',
    contract_upto: '',
    department_section: '',
    father_or_husband_name: '',
    date_of_birth: '',
    date_of_joining: '',
    blood_group: '',
    present_address: '',
    office_phone: '',
    mobile_number: '',
    email_address: user?.email || '',
    renewal_reason: '',
    photo_url: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPhotoFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((formData.employment_type === 'TEMPORARY' || formData.employment_type === 'CONTRACT') && !formData.contract_upto) {
      setError('Contract upto date is required for temporary/contract employees.')
      return
    }

    if ((formData.request_type === 'RENEWAL' || formData.request_type === 'DUPLICATE') && !formData.renewal_reason.trim()) {
      setError('Please provide renewal/duplicate reason.')
      return
    }

    if (!photoFile) {
      setError('Please upload a passport-size photograph.')
      return
    }

    if (!photoFile.type.startsWith('image/')) {
      setError('Only image files are allowed for photograph upload.')
      return
    }

    if (photoFile.size > 5 * 1024 * 1024) {
      setError('Photograph size must be 5 MB or less.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const fileExt = photoFile.name.split('.').pop() || 'jpg'
      const safeFileExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const filePath = `identity-cards/${user?.id || 'user'}-${Date.now()}.${safeFileExt}`

      const { error: uploadError } = await supabase.storage
        .from('identity-card-photos')
        .upload(filePath, photoFile, { upsert: false })

      if (uploadError) {
        throw new Error(`Photo upload failed: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from('identity-card-photos')
        .getPublicUrl(filePath)

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get uploaded photo URL')
      }

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/identity-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ...formData, photo_url: publicUrlData.publicUrl }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.error || 'Failed to submit form')
      }

      router.push('/dashboard?success=Identity card form submitted successfully')
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
            <h1 className="text-xl font-bold text-white">Identity Card Application</h1>
            <p className="text-zinc-200 text-sm mt-0.5">Apply for institutional identity card</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Request Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Application Type *</label>
              <select
                name="request_type"
                value={formData.request_type}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
              >
                <option value="FRESH">Fresh</option>
                <option value="RENEWAL">Renewal</option>
                <option value="DUPLICATE">Duplicate</option>
              </select>
            </div>

            {/* Employee Information Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Employee Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Employee *</label>
                  <input
                    type="text"
                    name="employee_name"
                    value={formData.employee_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Code *</label>
                  <input
                    type="text"
                    name="employee_code"
                    value={formData.employee_code}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation *</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type *</label>
                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="TEMPORARY">Temporary</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
              </div>

              {(formData.employment_type === 'TEMPORARY' || formData.employment_type === 'CONTRACT') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract Upto *</label>
                  <input
                    type="date"
                    name="contract_upto"
                    value={formData.contract_upto}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department / Center / School / Section *</label>
                  <input
                    type="text"
                    name="department_section"
                    value={formData.department_section}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Father's / Husband's Name *</label>
                  <input
                    type="text"
                    name="father_or_husband_name"
                    value={formData.father_or_husband_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth *</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

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

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Group *</label>
                  <input
                    type="text"
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Present Address *</label>
                <input
                  type="text"
                  name="present_address"
                  value={formData.present_address}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone No. (Office) *</label>
                  <input
                    type="tel"
                    name="office_phone"
                    value={formData.office_phone}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number *</label>
                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail ID *</label>
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

            {/* Photo Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Photo Upload</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Passport Size Photograph *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1.5">Supported: JPG, PNG, WEBP (max 5 MB)</p>
              </div>
            </div>

            {(formData.request_type === 'RENEWAL' || formData.request_type === 'DUPLICATE') && (
              <div className="border-t border-gray-100 pt-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason for Renewal / Duplicate *
                </label>
                <input
                  type="text"
                  name="renewal_reason"
                  value={formData.renewal_reason}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 pop-cta btn-neon text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 transition text-sm" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
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
