import PatientManagement from "../../components/patient-management"
import { authentication } from "@/app/actions/authentication"

export default async function pacientes() {
  const session = await authentication()

  if (session?.user?.role !== "admin") {
    return <div>No tienes permiso para acceder a esta página.</div>
  }

  return (
    <div>
      <PatientManagement />
    </div>
  )
}
