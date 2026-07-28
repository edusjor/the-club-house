export function getDashboardPath(role?: string | null): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "VENDOR":
      return "/vendor/dashboard";
    case "PARENT":
      return "/parent/dashboard";
    default:
      return "/unauthorized";
  }
}
