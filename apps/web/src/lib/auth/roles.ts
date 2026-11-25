/** Roles allowed into the back-office (F01 AC-8). The API still enforces permissions. */
export const STAFF_ROLES = ["Admin", "Support"] as const;

export function isStaff(user: { roles: readonly string[] } | null | undefined): boolean {
  return !!user && user.roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
}
