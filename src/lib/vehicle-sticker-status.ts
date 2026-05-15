import type { VehicleStickerFormRecord } from "@/lib/vehicle-sticker-store";

function extractSignerLabel(recommendationText: string | null, fallbackStageName: string) {
  const text = (recommendationText ?? "").trim();
  if (!text) return fallbackStageName;

  const prefix = text.split(":")[0]?.trim() ?? "";
  if (!prefix) return fallbackStageName;

  if (/security/i.test(prefix)) return "Security Office";
  if (/student\s*affairs|hostel/i.test(prefix)) return "Student Affairs";
  if (/hod/i.test(prefix)) return "HoD";
  if (/supervisor/i.test(prefix)) return "Supervisor";
  if (/stage\s*\d+/i.test(prefix)) return fallbackStageName;

  return prefix;
}

export function getVehicleStickerStatusText(form: VehicleStickerFormRecord) {
  if (form.overallStatus === "rejected") {
    const rejectedStage = form.approvals.find((approval) => approval.decision === "rejected");
    if (rejectedStage) {
      return `Rejected at Stage ${rejectedStage.stageNumber}`;
    }
    return "Rejected";
  }

  if (form.overallStatus === "approved") {
    return "Completed - Sticker issued";
  }

  const approvedStages = form.approvals
    .filter((approval) => approval.decision === "approved")
    .sort((a, b) => b.stageNumber - a.stageNumber);

  const lastApproved = approvedStages[0];
  if (lastApproved) {
    const signer = extractSignerLabel(lastApproved.recommendationText, lastApproved.stageName);
    return `Pending - Signed by ${signer}`;
  }

  return "Pending - Submitted";
}

export function getVehicleStickerStatusBadgeClass(form: VehicleStickerFormRecord) {
  if (form.overallStatus === "rejected") {
    return "bg-red-100 text-red-700";
  }
  if (form.overallStatus === "approved") {
    return "bg-green-100 text-green-700";
  }
  return "bg-amber-100 text-amber-700";
}
