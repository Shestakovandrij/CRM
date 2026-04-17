import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          console.log("[auth] missing credentials");
          return null;
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        console.log("[auth] email:", JSON.stringify(email), "adminEmail:", JSON.stringify(adminEmail));
        console.log("[auth] hash length:", adminPasswordHash?.length, "starts:", adminPasswordHash?.slice(0, 7));

        if (!adminEmail || !adminPasswordHash) {
          console.log("[auth] missing env vars");
          return null;
        }
        if (email !== adminEmail) {
          console.log("[auth] email mismatch");
          return null;
        }

        const valid = await bcrypt.compare(password, adminPasswordHash);
        console.log("[auth] bcrypt valid:", valid);
        if (!valid) return null;

        return { id: "1", email: adminEmail, name: "Admin" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname === "/login";
      if (isOnLogin) return isLoggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      return isLoggedIn;
    },
  },
});
