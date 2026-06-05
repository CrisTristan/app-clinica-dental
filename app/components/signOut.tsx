"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function SignOut() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return <button onClick={handleSignOut}>Salir</button>
}
