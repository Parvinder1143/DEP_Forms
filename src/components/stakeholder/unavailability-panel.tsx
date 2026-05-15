import { cancelOwnUnavailabilityRequest, submitUnavailabilityRequest } from "@/app/actions/delegation";
import { toDisplayRole } from "@/lib/auth";
import { listDelegationRequestsForRequester, listIncomingActiveQueueDelegationsForUser } from "@/lib/delegation-store";
import { listUsers } from "@/lib/user-store";
import { getStagesForRole, getWorkflow } from "@/lib/workflow-engine";
import type { AppRole } from "@/lib/mock-db";

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "TERMINATED") return "bg-orange-100 text-orange-700";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-700";
}

export async function UnavailabilityPanel(props: {
  userId: string;
  assignedRole: AppRole | null;
}) {
  const queueDefinitions = [
    { key: "email-id", label: "Email Queue" },
    { key: "vehicle-sticker", label: "Vehicle Sticker Queue" },
    { key: "identity-card", label: "Identity Card Queue" },
    { key: "guest-house", label: "Guest House Queue" },
    { key: "hostel-undertaking", label: "Hostel Undertaking Queue" },
  ] as const;

  const queueWorkflows = await Promise.all(
    queueDefinitions.map(async (queue) => ({
      ...queue,
      workflow: await getWorkflow(queue.key),
    }))
  );

  const queueOptions = props.assignedRole
    ? queueWorkflows.filter((item) => {
        if (!item.workflow || !props.assignedRole) return false;
        return getStagesForRole(item.workflow, props.assignedRole).length > 0;
      })
    : [];

  const [requests, allUsers, incomingQueueDelegations] = await Promise.all([
    listDelegationRequestsForRequester(props.userId),
    listUsers(),
    listIncomingActiveQueueDelegationsForUser(props.userId),
  ]);

  const replacementOptions = allUsers
    .filter((user) => user.id !== props.userId && user.role !== "SYSTEM_ADMIN")
    .sort((a, b) => {
      const aSameRole = a.role === props.assignedRole ? 0 : 1;
      const bSameRole = b.role === props.assignedRole ? 0 : 1;
      if (aSameRole !== bSameRole) return aSameRole - bSameRole;
      return a.email.localeCompare(b.email);
    });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Unavailability & Delegation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Notify System Admin when you are unavailable.
          </p>
        </div>
      </div>

      {props.assignedRole ? (
        <form action={submitUnavailabilityRequest} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Requesting delegation for role: {toDisplayRole(props.assignedRole)}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Start Date</label>
            <input name="startsOn" type="date" required className="input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">End Date</label>
            <input name="endsOn" type="date" required className="input w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Reason</label>
            <textarea
              name="reason"
              required
              rows={3}
              className="input min-h-20 w-full resize-y"
              placeholder="Please mention why you are unavailable."
            />
          </div>
          <div className="hidden sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Proposed Replacement (Optional)
            </label>
            <select name="replacementUserId" className="input w-full">
              <option value="">No proposal (admin will assign)</option>
              {replacementOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName ? `${user.fullName} · ` : ""}
                  {user.email}
                  {user.role ? ` · ${toDisplayRole(user.role)}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className="mt-1 text-xs text-slate-500">
              Queue forwarding below applies only to your normal role queues.
            </p>
          </div>
          {incomingQueueDelegations.length > 0 ? (
            <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Incoming Delegated Queues
              </p>
              <p className="mt-1 text-xs text-amber-700">
                These queues were delegated to you by others and cannot be re-forwarded here. On your approval, admin will decide reassignment (or skip assignment).
              </p>
              <div className="mt-2 space-y-1">
                {incomingQueueDelegations.map((item) => {
                  const queueLabel = queueDefinitions.find((queue) => queue.key === item.queueKey)?.label ?? item.queueKey;
                  return (
                    <p key={`${item.sourceRequestId}_${item.queueKey}`} className="text-xs font-semibold text-amber-900">
                      {queueLabel} (from {item.sourceRequesterName ?? item.sourceRequesterEmail})
                    </p>
                  );
                })}
              </div>
            </div>
          ) : null}
          {queueOptions.length > 0 ? (
            <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Queue-wise Forwarding (Optional)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Forward only the queues you want. Unselected queues stay with you.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {queueOptions.map((queue) => (
                  <div key={queue.key}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {queue.label}
                    </label>
                    <select name={`queueDelegate_${queue.key}`} className="input w-full">
                      <option value="">Do not forward</option>
                      {replacementOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName ? `${user.fullName} · ` : ""}
                          {user.email}
                          {user.role ? ` · ${toDisplayRole(user.role)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <input type="hidden" name="queueKeys" value={queueOptions.map((q) => q.key).join(",")} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              Submit Unavailability Request
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You do not currently have an assigned base role to create an unavailability request.
        </p>
      )}

      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your Recent Requests</h3>
        {requests.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No unavailability requests submitted yet.
          </p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{toDisplayRole(request.delegatedRole)}</p>
                <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass(request.status)}`}>
                  {request.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {new Date(request.startsAt).toLocaleDateString("en-IN")} - {new Date(request.endsAt).toLocaleDateString("en-IN")}
              </p>
              <p className="mt-1 text-sm text-slate-600">Reason: {request.reason}</p>
              {request.adminRemarks ? (
                <p className="mt-1 text-sm text-slate-600">Admin note: {request.adminRemarks}</p>
              ) : null}
              {request.status === "TERMINATED" ? (
                <p className="mt-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
                  Your temporary role arrangement was terminated by System Admin.
                </p>
              ) : null}
              {request.status === "PENDING" ? (
                <form action={cancelOwnUnavailabilityRequest} className="mt-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel Request
                  </button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
