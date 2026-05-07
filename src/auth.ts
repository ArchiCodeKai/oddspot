import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // cast 解決 PrismaAdapter 內部 @auth/core 與 next-auth 主版本的型別不對齊
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Line({
      clientId: process.env.AUTH_LINE_ID,
      clientSecret: process.env.AUTH_LINE_SECRET,
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnProfile = nextUrl.pathname.startsWith("/profile");

      if (isOnProfile && !isLoggedIn) {
        return false;
      }

      return true;
    },
    // database session：user 是 Prisma User row（runtime 含 role），但 NextAuth 預設型別不認
    // 透過 cast 讀 role 欄位塞進 session
    session({ session, user }) {
      const dbUser = user as typeof user & { role?: string };
      session.user.id = user.id;
      session.user.role = dbUser.role ?? "user";
      return session;
    },
  },
  events: {
    // ADMIN_EMAIL 對應 user 每次登入時保證 role=admin（防 DB role 漂移）
    // env 沒設就跳過，避免誤升不存在的人
    async signIn({ user }) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail || !user.email || user.email !== adminEmail) return;
      if (!user.id) return;
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      if (dbUser?.role === "admin") return;
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
    },
  },
});
