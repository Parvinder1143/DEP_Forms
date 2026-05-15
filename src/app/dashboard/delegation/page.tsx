import { redirect } from "next/navigation";
import { getRoleDisplayContext, requireUser } from "@/lib/auth";
import { getActiveDelegatedRoleForUser } from "@/lib/delegation-store";
import { UnavailabilityPanel } from "@/components/stakeholder/unavailability-panel";
import { StakeholderDashboardScaffold } from "@/components/stakeholder/dashboard-scaffold";

export default async function DelegationDashboardPage() {
  const user = await requireUser();

  if (user.role === "SYSTEM_ADMIN") {
    redirect("/admin");
  }

  const delegatedRole = await getActiveDelegatedRoleForUser(user.id);
  const effectiveRole = delegatedRole ?? user.role;

  if (!effectiveRole) {
    redirect("/pending-role");
  }

  const roleDisplay = getRoleDisplayContext({
    role: effectiveRole,
    baseRole: user.role,
    isTemporarilyAssigned: Boolean(delegatedRole && delegatedRole !== user.role),
  });

  return (
    <StakeholderDashboardScaffold
      userId={user.id}
      queueLinkRole={user.role}
      roleLabel={roleDisplay.activeRoleLabel}
      baseRoleLabel={roleDisplay.baseRoleLabel}
      isTemporarilyAssigned={roleDisplay.isTemporarilyAssigned}
      activeRole={effectiveRole}
    >
      <UnavailabilityPanel userId={user.id} assignedRole={user.role} />
    </StakeholderDashboardScaffold>
  );
}
