import { getServerSession } from "next-auth"
import type { NextAuthOptions } from "next-auth"
import authConfig from "./auth.config"

export const authOptions: NextAuthOptions = {
  ...authConfig,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
      }
      return session
    },
  },
}

export const auth = () => getServerSession(authOptions)
