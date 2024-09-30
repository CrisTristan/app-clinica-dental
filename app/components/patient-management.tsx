"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, Calendar, FileText, Settings, Menu, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PatientManagement() {
  const [currentPage, setCurrentPage] = useState('Pacientes')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  const navItems = [
    { name: 'Pacientes', icon: <Users className="mr-2 h-4 w-4" /> },
    { name: 'Citas', icon: <Calendar className="mr-2 h-4 w-4" /> },
    { name: 'Historiales', icon: <FileText className="mr-2 h-4 w-4" /> },
    { name: 'Configuración', icon: <Settings className="mr-2 h-4 w-4" /> },
  ]

  const patients = [
    { id: 1, name: 'Ana Martínez', phone: '123-456-7890', email: 'ana@example.com', lastVisit: '2023-05-15', nextAppointment: '2023-06-20' },
    { id: 2, name: 'Carlos Rodríguez', phone: '098-765-4321', email: 'carlos@example.com', lastVisit: '2023-04-30', nextAppointment: '2023-06-15' },
    { id: 3, name: 'Elena Gómez', phone: '555-555-5555', email: 'elena@example.com', lastVisit: '2023-05-10', nextAppointment: '2023-07-01' },
    { id: 4, name: 'David Torres', phone: '333-333-3333', email: 'david@example.com', lastVisit: '2023-05-20', nextAppointment: '2023-06-25' },
    { id: 5, name: 'Laura Sánchez', phone: '444-444-4444', email: 'laura@example.com', lastVisit: '2023-05-05', nextAppointment: '2023-06-18' },
  ]

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePatientClick = (patientId: number, patientName: string) => {
    router.push(`/pacientes/${encodeURIComponent(patientId)}?name:${patientName}`)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="bg-white w-64 hidden md:block p-4 border-r">
        <div className="text-2xl font-bold mb-6 text-primary">Clínica Dental</div>
        <nav>
          <ul>
            {navItems.map((item) => (
              <li key={item.name} className="mb-2">
                <Button
                  variant={currentPage === item.name ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCurrentPage(item.name)}
                >
                  {item.icon}
                  {item.name}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{currentPage}</h1>
            <Button variant="outline" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </header>

          {currentPage === 'Pacientes' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar pacientes..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead>Próxima Cita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow 
                      key={patient.id} 
                      onClick={() => handlePatientClick(patient.id, patient.name)}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>{patient.email}</TableCell>
                      <TableCell>{patient.lastVisit}</TableCell>
                      <TableCell>{patient.nextAppointment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {currentPage !== 'Pacientes' && (
            <p className="text-gray-500">Contenido de {currentPage} en desarrollo.</p>
          )}
        </div>
      </main>
    </div>
  )
}