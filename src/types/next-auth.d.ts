import { DefaultSession } from "next-auth";

// 只擴充 Session，不擴充 User / AdapterUser
// 因為 @auth/prisma-adapter 內部用獨立版本的 @auth/core，擴充 User 會觸發雙版本衝突
// callback 內透過 cast 從 DB row 拿 role 欄位（Prisma 型別會自動有）
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}
