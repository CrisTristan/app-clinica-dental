import PatientManagement from "../../components/patient-management"
import { createClient } from "@/lib/supabase/server"

export default async function pacientes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.user_metadata?.role !== "admin") {
    return <div>Tu no eres Admin</div>
  }

  return (
    <div>
      <PatientManagement />
    </div>
  )
}