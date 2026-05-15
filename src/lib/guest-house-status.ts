export type GuestHouseWorkflowStatus = "pending" | "in_review" | "approved" | "rejected";

export function getGuestHouseStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "in_review":
      return "In Review";
    case "submitted":
      return "Submitted";
    default:
      return "Pending";
  }
}

export function getGuestHouseStatusBadgeClass(status: string): string {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    case "in_review":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
