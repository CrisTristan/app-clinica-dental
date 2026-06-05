import { createClient } from '@supabase/supabase-js'

// Cliente con service role — solo usar en server (API routes, server actions)
// Bypasses RLS. Nunca exponer al browser.
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
