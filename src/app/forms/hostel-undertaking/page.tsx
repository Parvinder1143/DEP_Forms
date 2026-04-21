import { requireApplicantFormAccess } from "@/lib/auth";
import { submitHostelUndertakingForm } from "@/app/actions/hostel-undertaking";

export default async function HostelUndertakingFormPage() {
  const user = await requireApplicantFormAccess("hostel-undertaking");
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Hostel Undertaking</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Student Undertaking Form</h1>
          <p className="mt-1 text-sm text-slate-500">Submit this once to move your request to Hostel Warden for acknowledgement.</p>
        </div>

        <form action={submitHostelUndertakingForm} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Student Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Student Name *</label>
                <input name="studentName" required className="input" />
              </div>
              <div>
                <label className="label">Entry Number *</label>
                <input name="entryNumber" required className="input" />
              </div>
              <div>
                <label className="label">Course *</label>
                <input name="courseName" required className="input" />
              </div>
              <div>
                <label className="label">Department *</label>
                <input name="department" required className="input" />
              </div>
              <div>
                <label className="label">Hostel Room No *</label>
                <input name="hostelRoomNo" required className="input" />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input
                  name="emailAddress"
                  type="email"
                  required
                  className="input bg-slate-100 text-slate-600"
                  defaultValue={user.email}
                  readOnly
                />
              </div>
              <div>
                <label className="label">Date of Joining *</label>
                <input name="dateOfJoining" type="date" required className="input" />
              </div>
              <div>
                <label className="label">Declaration Date *</label>
                <input type="hidden" name="declarationDate" value={todayDate} />
                <input
                  type="date"
                  className="input bg-slate-100 text-slate-600"
                  value={todayDate}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label className="label">Blood Group *</label>
                <input name="bloodGroup" required className="input" />
              </div>
              <div>
                <label className="label">Category *</label>
                <input name="category" required className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Emergency Contact Number *</label>
                <input name="emergencyContactNo" required className="input" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Fee Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">HEF Amount *</label>
                <input name="hefAmount" type="number" step="0.01" min="0" required className="input" />
              </div>
              <div>
                <label className="label">Mess Security *</label>
                <input name="messSecurity" type="number" step="0.01" min="0" required className="input" />
              </div>
              <div>
                <label className="label">Mess Admission Fee *</label>
                <input name="messAdmissionFee" type="number" step="0.01" min="0" required className="input" />
              </div>
              <div>
                <label className="label">Mess Charges *</label>
                <input name="messCharges" type="number" step="0.01" min="0" required className="input" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Parent / Guardian Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Relationship *</label>
                <input name="parentRelationship" required className="input" placeholder="Father / Mother / Guardian" />
              </div>
              <div>
                <label className="label">Office Address Line 1</label>
                <input name="parentOfficeAddressLine1" className="input" />
              </div>
              <div>
                <label className="label">Office Address Line 2</label>
                <input name="parentOfficeAddressLine2" className="input" />
              </div>
              <div>
                <label className="label">Office Mobile</label>
                <input
                  name="parentOfficeMobile"
                  pattern="[0-9]{10}"
                  inputMode="numeric"
                  maxLength={10}
                  className="input"
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="label">Office Telephone</label>
                <input name="parentOfficeTelephone" className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Office Email</label>
                <input name="parentOfficeEmail" type="email" className="input" />
              </div>
              <div>
                <label className="label">Residence Address Line 1 *</label>
                <input name="parentResidenceAddressLine1" required className="input" />
              </div>
              <div>
                <label className="label">Residence Address Line 2</label>
                <input name="parentResidenceAddressLine2" className="input" />
              </div>
              <div>
                <label className="label">Residence Mobile *</label>
                <input
                  name="parentResidenceMobile"
                  required
                  pattern="[0-9]{10}"
                  inputMode="numeric"
                  maxLength={10}
                  className="input"
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="label">Residence Telephone</label>
                <input name="parentResidenceTelephone" className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Residence Email</label>
                <input name="parentResidenceEmail" type="email" className="input" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Local Guardian Details (Optional)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Relationship</label>
                <input name="localRelationship" className="input" />
              </div>
              <div>
                <label className="label">Office Address Line 1</label>
                <input name="localOfficeAddressLine1" className="input" />
              </div>
              <div>
                <label className="label">Office Address Line 2</label>
                <input name="localOfficeAddressLine2" className="input" />
              </div>
              <div>
                <label className="label">Office Mobile</label>
                <input name="localOfficeMobile" className="input" />
              </div>
              <div>
                <label className="label">Office Telephone</label>
                <input name="localOfficeTelephone" className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Office Email</label>
                <input name="localOfficeEmail" type="email" className="input" />
              </div>
              <div>
                <label className="label">Residence Address Line 1</label>
                <input name="localResidenceAddressLine1" className="input" />
              </div>
              <div>
                <label className="label">Residence Address Line 2</label>
                <input name="localResidenceAddressLine2" className="input" />
              </div>
              <div>
                <label className="label">Residence Mobile</label>
                <input name="localResidenceMobile" className="input" />
              </div>
              <div>
                <label className="label">Residence Telephone</label>
                <input name="localResidenceTelephone" className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Residence Email</label>
                <input name="localResidenceEmail" type="email" className="input" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Attachments</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Passport Size Photo *</label>
                <input name="passportPhoto" type="file" accept="image/*" required className="input" />
              </div>
              <div>
                <label className="label">Parent Signature (JPG) *</label>
                <input
                  name="parentSignatureDoc"
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  required
                  className="input"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Undertaking</h2>
            <p className="text-sm leading-6 text-slate-700">
              I, the undersigned, hereby declare that I have read the hostel rules of IIT Ropar and I have been also informed
              about the anti-ragging policy and prohibitions in the hostel premises. I promise to abide by the rules and
              regulations of this Institute, amended and enforced from time to time. I will not violate any information
              Technology (IT) rules and will not misuse the internet, email and any institute facilities. I am aware that the
              hostel / Institute administration has the right to terminate my accommodation in the hostel at their discretion.
            </p>
            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input
                name="undertakingAccepted"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>I have read and agree to the above undertaking.</span>
            </label>
          </section>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Submit Hostel Undertaking
          </button>
        </form>
      </div>
    </div>
  );
}
