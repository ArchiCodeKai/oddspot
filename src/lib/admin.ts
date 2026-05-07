import type { Session } from "next-auth";

// 判定 admin 權限：DB role 為主、env ADMIN_EMAIL 為過渡期 fallback
// 一旦 ADMIN_EMAIL 對應 user 第一次登入過（events.signIn 會升級 role），DB role 就會生效
// 之後就算 env 設定弄丟，已升級的 admin 仍能進
export function isAdminSession(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.role === "admin") return true;
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!(
    adminEmail &&
    session.user.email &&
    session.user.email === adminEmail
  );
}
