import type { IdentityCardFormRecord } from "@/lib/identity-card-store";

export function getIdentityCardStatusText(form: IdentityCardFormRecord) {
  if (form.overallStatus === "rejected") {
    const rejectedStage = form.approvals.find((approval) => approval.decision === "rejected");
    if (rejectedStage) {
      return `Rejected at Stage ${rejectedStage.stageNumber}`;
    }
    return "Rejected";
  }

  if (form.overallStatus === "approved") {
    return "Completed - ID card is ready";
  }

  if (form.currentStage === 3) {
    return "Pending - Recommended by Establishment";
  }
  if (form.currentStage === 2) {
    return "Pending - Forwarded by HoD / Section Head";
  }

  return "Pending - Submitted";
}

export function getIdentityCardStatusBadgeClass(form: IdentityCardFormRecord) {
  if (form.overallStatus === "rejected") {
    return "bg-red-100 text-red-700";
  }
  if (form.overallStatus === "approved") {
    return "bg-green-100 text-green-700";
  }
  return "bg-amber-100 text-amber-700";
}
