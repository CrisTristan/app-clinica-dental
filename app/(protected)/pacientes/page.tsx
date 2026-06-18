import PatientManagement from "../../components/patient-management"
import { authentication } from "@/app/actions/authentication"

export default async function pacientes() {
  const session = await authentication()
  const role = session?.user?.role

  if (role !== "admin" && role !== "dentista" && role !== "recepcionista") {
    return <div>No tienes permiso para acceder a esta página.</div>
  }

  return (
    <div>
      <PatientManagement role={role} />
    </div>
  )
}
