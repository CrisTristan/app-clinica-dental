import Prescription from "@/app/components/Prescription/Prescription"
import { authentication } from "@/app/actions/authentication"

export default async function PrescriptionsPage() {
  const session = await authentication()
  const role = session?.user?.role

  if (role !== "admin" && role !== "dentista") {
    return <div className="p-6">No tienes permiso para acceder a esta página.</div>
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Prescription />
      </div>
    </main>
  )
}
