import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/api/auth/verify-email",
  "/testing",
  "/appointment-confirmation/api",
  "/appointments/api",
]

export default withAuth(
  () => {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        return publicRoutes.includes(req.nextUrl.pathname) || !!token
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
