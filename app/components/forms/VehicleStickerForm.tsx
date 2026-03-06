'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { supabase } from '@/lib/supabase'

type VehicleRow = {
  vehicle_registration_number: string
  vehicle_type: '2W' | '4W'
  make_model: string
  colour: string
}

const emptyVehicleRow = (): VehicleRow => ({
  vehicle_registration_number: '',
  vehicle_type: '2W',
  make_model: '',
  colour: ''
})

export default function VehicleStickerForm() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    applicant_category: 'REGULAR_STUDENT',
    full_name: '',
    designation: '',
    applicant_identifier: '',
    department_section: '',
    residential_address: '',
    mobile_number: '',
    email: user?.email || '',
    driving_license_number: '',
    driving_license_validity: '',
    declaration_confirmed: false
  })
  const [vehicles, setVehicles] = useState<VehicleRow[]>([emptyVehicleRow()])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const updateVehicle = (index: number, field: keyof VehicleRow, value: string) => {
    setVehicles((prev) => prev.map((vehicle, i) => {
      if (i !== index) return vehicle
      if (field === 'vehicle_type') {
        return { ...vehicle, vehicle_type: value as '2W' | '4W' }
      }
      return { ...vehicle, [field]: value }
    }))
  }

  const addVehicleRow = () => {
    if (vehicles.length >= 3) return
    setVehicles((prev) => [...prev, emptyVehicleRow()])
  }

  const removeVehicleRow = (index: number) => {
    if (vehicles.length === 1) return
    setVehicles((prev) => prev.filter((_, i) => i !== index))
  }

  const hasIncompleteVehicleRow = vehicles.some((vehicle) => (
    !vehicle.vehicle_registration_number.trim()
    || !vehicle.vehicle_type
    || !vehicle.make_model.trim()
    || !vehicle.colour.trim()
  ))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.declaration_confirmed) {
      setError('Please confirm the declaration before submitting.')
      return
    }

    if (hasIncompleteVehicleRow) {
      setError('Please complete all details for each vehicle row.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/vehicle-stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ...formData, vehicles }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.error || 'Failed to submit form')
      }

      router.push('/dashboard?success=Vehicle sticker application submitted successfully')
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
            <h1 className="text-xl font-bold text-white">Vehicle Sticker Application</h1>
            <p className="text-zinc-200 text-sm mt-0.5">Apply for campus parking sticker</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Applicant Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Applicant Category *</label>
              <select
                name="applicant_category"
                value={formData.applicant_category}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
              >
                <option value="REGULAR_STUDENT">Regular Student</option>
                <option value="PROJECT_STAFF">Project Staff</option>
                <option value="JRF">JRF</option>
                <option value="INTERN">Intern</option>
                <option value="POST_DOC">Post Doc</option>
                <option value="RA">RA</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Applicant Information Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Applicant Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Applicant *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

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
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Entry / Emp Number *</label>
                  <input
                    type="text"
                    name="applicant_identifier"
                    value={formData.applicant_identifier}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department / Section *</label>
                  <input
                    type="text"
                    name="department_section"
                    value={formData.department_section}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
                <textarea
                  name="residential_address"
                  value={formData.residential_address}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone / Mobile No. *</label>
                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

              </div>
            </div>

            {/* Driving License Section */}
            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Driving License Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">License Number *</label>
                  <input
                    type="text"
                    name="driving_license_number"
                    value={formData.driving_license_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">License Validity Date *</label>
                  <input
                    type="date"
                    name="driving_license_validity"
                    value={formData.driving_license_validity}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Details Section */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle Details</h2>
                <button
                  type="button"
                  onClick={addVehicleRow}
                  className="text-xs font-semibold text-zinc-700 border border-zinc-300 px-2.5 py-1 rounded hover:bg-zinc-50"
                >
                  + Add Vehicle
                </button>
              </div>

              <div className="space-y-3">
                {vehicles.map((vehicle, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600">Vehicle #{index + 1}</p>
                      {vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehicleRow(index)}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Vehicle Registration No."
                        value={vehicle.vehicle_registration_number}
                        onChange={(e) => updateVehicle(index, 'vehicle_registration_number', e.target.value)}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                      />
                      <select
                        value={vehicle.vehicle_type}
                        onChange={(e) => updateVehicle(index, 'vehicle_type', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                      >
                        <option value="2W">2W</option>
                        <option value="4W">4W</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Make / Model"
                        value={vehicle.make_model}
                        onChange={(e) => updateVehicle(index, 'make_model', e.target.value)}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Colour"
                        value={vehicle.colour}
                        onChange={(e) => updateVehicle(index, 'colour', e.target.value)}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="declaration_confirmed"
                  checked={formData.declaration_confirmed}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded border-gray-300 accent-zinc-700"
                  required
                />
                <span>
                  I hereby solemnly declare that the information given above is correct to the best of my knowledge and belief.
                </span>
              </label>
            </div>

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
