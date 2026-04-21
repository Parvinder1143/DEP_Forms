import type { HostelUndertakingFormRecord } from "@/lib/hostel-undertaking-store";

function extractApproverRoleFromRecommendation(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const withoutRejectedPrefix = normalized.replace(/^Rejected by\s+/i, "");
  const [prefix] = withoutRejectedPrefix.split(":");
  const roleLabel = (prefix ?? "").trim();
  return roleLabel || null;
}

function getLatestApprovalRole(form: HostelUndertakingFormRecord) {
  const latestApproval = [...form.approvals]
    .filter((approval) => Boolean(approval.recommendationText))
    .sort((a, b) => b.stageNumber - a.stageNumber)[0];

  return extractApproverRoleFromRecommendation(latestApproval?.recommendationText);
}

export function getHostelUndertakingStatusText(form: HostelUndertakingFormRecord) {
  const approverRole = getLatestApprovalRole(form) ?? "Hostel Warden";

  if (form.overallStatus === "rejected") {
    return `Rejected by ${approverRole}`;
  }

  if (form.overallStatus === "approved") {
    return `Completed - Acknowledged by ${approverRole}`;
  }

  return "Pending - Submitted";
}

export function getHostelUndertakingStatusBadgeClass(form: HostelUndertakingFormRecord) {
  if (form.overallStatus === "rejected") {
    return "bg-red-100 text-red-700";
  }
  if (form.overallStatus === "approved") {
    return "bg-green-100 text-green-700";
  }
  return "bg-amber-100 text-amber-700";
}
