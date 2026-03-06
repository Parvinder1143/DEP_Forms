'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type RoomType = 'EXECUTIVE_SUITE' | 'BUSINESS_ROOM'
type RoomCategory = 'A' | 'B' | 'B1' | 'B2'

const guestHouseTerms = [
  'Check-in and check-out time will be 01:00 PM and 11:00 AM respectively.',
  'One day minimum charge shall be levied for all bookings unless cancelled at least 24 hours before commencement of the booked date.',
  'For advance bulk booking of rooms for conferences/workshops, cancellation request must be made at least one week prior to the event.',
  'Request for bulk booking may not be made more than 90 days prior to the event.',
  'Request for regular booking should preferably be submitted at least two days before guest arrival.',
  'Students requiring accommodation for parents must route requests through respective wardens and the Dean of Students.',
  'Not more than two persons will be allowed in double occupancy bed room.',
  'Booking is not permitted for guests undergoing medical treatment or suffering from communicable disease.',
  'Pets/dogs/cats are not allowed in the guest house.',
  'MHRD/Government of India clearance is required for foreign passport holders staying in the guest house.',
  'In emergency due to heavy booking, a single occupant may be asked to share accommodation based on available rooms and precedence.',
  'Request for availing dining facility should be communicated well in advance at reception.',
  'Accommodation will be provided on approval of competent authority and subject to availability.',
]

export default function GuestHouseForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_gender: 'Male',
    guest_address: '',
    guest_contact_number: '',
    number_of_guests: 1,
    number_of_rooms: 1,
    occupancy_type: 'Single' as 'Single' | 'Double',
    arrival_date: '',
    arrival_time: '',
    departure_date: '',
    departure_time: '',
    purpose_of_booking: '',
    room_type: 'EXECUTIVE_SUITE' as RoomType,
    room_category: 'A' as RoomCategory,
    boarding_lodging_payable_by_guest: false,
    project_budget_head: '',
    remarks: '',
    competent_authority_approval_attached: false,
    proposer_name: '',
    proposer_designation: '',
    proposer_department: '',
    proposer_identifier: '',
    proposer_mobile: '',
    application_date: new Date().toISOString().slice(0, 10),
    applicant_signature_name: '',
    undertaking_accepted: false,
  })

  const allowedCategoriesByRoomType: Record<RoomType, RoomCategory[]> = {
    EXECUTIVE_SUITE: ['A', 'B'],
    BUSINESS_ROOM: ['A', 'B1', 'B2'],
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type } = e.target
    const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value

    setFormData((prev) => {
      const next = { ...prev, [name]: value }

      // Keep room category valid when room type changes.
      if (name === 'room_type') {
        const roomType = value as RoomType
        if (!allowedCategoriesByRoomType[roomType].includes(next.room_category)) {
          next.room_category = allowedCategoriesByRoomType[roomType][0]
        }
      }

      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.undertaking_accepted) {
      setError('Please accept the undertaking before submitting.')
      setLoading(false)
      return
    }

    if (!formData.competent_authority_approval_attached) {
      setError('Please confirm that competent authority approval is attached.')
      setLoading(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/guest-house', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.error || 'Failed to submit form')
      }

      router.push('/dashboard?success=Guest house reservation submitted successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const roomCategoryOptions = allowedCategoriesByRoomType[formData.room_type]

  return (
    <main className="min-h-screen bg-transparent pt-16 page-enter">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="back-link mb-6 transition">← Back</button>

        <div className="pop-panel section-glass rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)', borderBottom: '1px solid #000000' }}>
            <h1 className="text-xl font-bold text-white">Guest House Reservation Form</h1>
            <p className="text-zinc-200 text-sm mt-0.5">Fill only required details from official form</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Guest Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Guest *</label>
                  <input type="text" name="guest_name" value={formData.guest_name} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender *</label>
                  <select name="guest_gender" value={formData.guest_gender} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address of Guest *</label>
                <textarea name="guest_address" value={formData.guest_address} onChange={handleChange} required rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm resize-none" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number *</label>
                  <input type="tel" name="guest_contact_number" value={formData.guest_contact_number} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">No. of Guests *</label>
                  <input type="number" name="number_of_guests" min={1} value={formData.number_of_guests} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">No. of Rooms *</label>
                  <input type="number" name="number_of_rooms" min={1} value={formData.number_of_rooms} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type of Occupancy *</label>
                  <select name="occupancy_type" value={formData.occupancy_type} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm">
                    <option value="Single">Single Occupancy</option>
                    <option value="Double">Double Occupancy</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Arrival and Departure</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Arrival Date *</label>
                    <input type="date" name="arrival_date" value={formData.arrival_date} onChange={handleChange} required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Arrival Time</label>
                    <input type="time" name="arrival_time" value={formData.arrival_time} onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Departure Date *</label>
                    <input type="date" name="departure_date" value={formData.departure_date} onChange={handleChange} required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Departure Time</label>
                    <input type="time" name="departure_time" value={formData.departure_time} onChange={handleChange}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Booking Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Purpose of Booking *</label>
                <textarea name="purpose_of_booking" value={formData.purpose_of_booking} onChange={handleChange} rows={2} required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm resize-none" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Room to be Booked *</label>
                  <select name="room_type" value={formData.room_type} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm">
                    <option value="EXECUTIVE_SUITE">Executive Suite Room</option>
                    <option value="BUSINESS_ROOM">Business Room</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                  <select name="room_category" value={formData.room_category} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm">
                    {roomCategoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
                  <input type="checkbox" name="boarding_lodging_payable_by_guest" checked={formData.boarding_lodging_payable_by_guest} onChange={handleChange}
                    className="mt-1 w-4 h-4 rounded border-gray-300 accent-emerald-600" />
                  <span className="text-sm text-gray-700">Boarding/Lodging charges will be paid by guest</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Project no. / Budget Head / Other</label>
                  <input type="text" name="project_budget_head" value={formData.project_budget_head} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks (if any)</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm resize-none" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Applicant / Proposer Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                  <input type="text" name="proposer_name" value={formData.proposer_name} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation *</label>
                  <input type="text" name="proposer_designation" value={formData.proposer_designation} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department *</label>
                  <input type="text" name="proposer_department" value={formData.proposer_department} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Code / Entry Number *</label>
                  <input type="text" name="proposer_identifier" value={formData.proposer_identifier} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number *</label>
                  <input type="tel" name="proposer_mobile" value={formData.proposer_mobile} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
                  <input type="date" name="application_date" value={formData.application_date} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Applicant Signature Name *</label>
                  <input type="text" name="applicant_signature_name" value={formData.applicant_signature_name} onChange={handleChange} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-sm" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Terms and Conditions</h2>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <ol className="list-decimal pl-4 space-y-2 text-sm text-gray-700">
                  {guestHouseTerms.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ol>

                <div className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-600 space-y-1">
                  <p>* GST charges will be extra as applicable.</p>
                  <p>** No GST on internal bookings from Institute Funds.</p>
                  <p>*** For project/external funding bookings, budget deduction/deposit rules apply as per institute norms.</p>
                  <p>**** Supporting document and approval from competent authority must be attached.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Category, Tariff, Eligibility, and Approving Authority</h2>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm bg-white min-w-230">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tariff</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Eligibility</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Approving Authority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-900">Executive Suite Room</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">Category-A (Free)</td>
                      <td className="px-3 py-2 text-gray-700">
                        Institute invited guests (members of statutory bodies), Chairman/BOG/Directors of IITs and other CFTIs, VCs of CFTIs,
                        experts for selection committee/proposal/seminar/thesis defense, and any other guests with permission of the Director.
                      </td>
                      <td className="px-3 py-2 text-gray-700">Director / Concerned Dean</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-900">Executive Suite Room</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">Category-B (Rs. 3500/-)</td>
                      <td className="px-3 py-2 text-gray-700">
                        Faculty/staff for self or family/relatives, IIT Ropar alumni, parents of students, and officials from Central/State Ministry or Administration.
                      </td>
                      <td className="px-3 py-2 text-gray-700">Chairman, Guest House Committee</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-900">Business Room</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">Category-A (Free)</td>
                      <td className="px-3 py-2 text-gray-700">
                        Institute invited guests (members of statutory bodies), Chairman/BOG/Directors of IITs and other CFTIs,
                        VCs of CFTIs, experts for selection committee/proposal/seminar/thesis defense, and any other guests with permission of the Director.
                      </td>
                      <td className="px-3 py-2 text-gray-700">Registrar / Concerned Dean / Associate Dean (as applicable), Director (for other guests)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-900">Business Room</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">Category B-1 (Rs. 2000/-)</td>
                      <td className="px-3 py-2 text-gray-700">
                        Guests invited by sponsored projects, faculty collaboration, consultancy, short-term courses, seminars, and conferences.
                      </td>
                      <td className="px-3 py-2 text-gray-700">Concerned Deans / Associate Deans / HoDs / Registrar (as applicable)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-900">Business Room</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">Category B-2 (Rs. 1200/-)</td>
                      <td className="px-3 py-2 text-gray-700">
                        Faculty/staff for self or family/relatives, IIT Ropar alumni, parents of students, and officials from Central/State Ministry or Administration.
                      </td>
                      <td className="px-3 py-2 text-gray-700">Chairman, Guest House Committee</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-3">
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
                <input type="checkbox" name="competent_authority_approval_attached" checked={formData.competent_authority_approval_attached} onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded border-gray-300 accent-emerald-600" />
                <span className="text-sm text-gray-700">Supporting document and approval from competent authority is attached *</span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
                <input type="checkbox" name="undertaking_accepted" checked={formData.undertaking_accepted} onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded border-gray-300 accent-emerald-600" />
                <span className="text-sm text-gray-700">I accept the undertaking terms mentioned in the guest house form *</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={loading}
                className="flex-1 pop-cta btn-neon text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 transition text-sm" style={{ background: 'linear-gradient(135deg, #111111 0%, #2a2a2a 100%)' }}>
                {loading ? 'Submitting...' : 'Submit Reservation'}
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
