"use client"

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Patient } from '../types/types'


export default function PatientManagement() {

  useEffect(()=>{
      const getAllPatients = ()=>{
          const response = fetch('http://localhost:3000/patients/api')
          response.then(data =>{
            return data.json()
          })
          .then(patients =>{
            console.log(patients)
            setPatients(patients)
          })
          .catch(error =>{
            console.log(error)
          })
      }

      getAllPatients()
  }, []);
  
  const [currentPage, setCurrentPage] = useState('Pacientes')
  const [searchTerm, setSearchTerm] = useState('')
  const [newPatient, setNewPatient] = useState(false);

  const [patient, setPatient] = useState({name: '', phone: '998'})
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([])
  const router = useRouter()

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatient((prevPatient) => ({
      ...prevPatient,
      [name]: value,
    }));


    // Valida el campo y establece el error si es necesario
    if (name === 'phone' && !/^\d+$/.test(value)) {
      setError('El número de teléfono solo debe contener dígitos.');
    } else {
      setError('');
    }
  };

  const navItems = [
    { name: 'Pacientes', icon: <Users className="mr-2 h-4 w-4" /> },
    { name: 'Citas', icon: <Calendar className="mr-2 h-4 w-4" /> },
    { name: 'Historiales', icon: <FileText className="mr-2 h-4 w-4" /> },
    { name: 'Configuración', icon: <Settings className="mr-2 h-4 w-4" /> },
  ]

  /*const patients = [
    { id: 1, name: 'Ana Martínez', phone: '123-456-7890', lastVisit: '2023-05-15', nextAppointment: '2023-06-20' },
    { id: 2, name: 'Carlos Rodríguez', phone: '098-765-4321', lastVisit: '2023-04-30', nextAppointment: '2023-06-15' },
    { id: 3, name: 'Elena Gómez', phone: '555-555-5555', lastVisit: '2023-05-10', nextAppointment: '2023-07-01' },
    { id: 4, name: 'David Torres', phone: '333-333-3333',  lastVisit: '2023-05-20', nextAppointment: '2023-06-25' },
    { id: 5, name: 'Laura Sánchez', phone: '444-444-4444',  lastVisit: '2023-05-05', nextAppointment: '2023-06-18' },
  ]*/

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.telefono.includes(searchTerm) /*||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())*/
  )

  const handlePatientClick = (patientId: number, patientName: string) => {
    router.push(`/pacientes/${encodeURIComponent(patientId)}/?id=${patientId}&name=${patientName}`)
  }

  const handleNewPatient = ()=>{
    setNewPatient(true);
  }

  const handleSavePatient = ()=>{  //Logica para guardar el paciente en la BD
    console.log("Nombre:", patient.name);
    console.log("Teléfono:", patient.phone);
    if(patient.phone.length<10){
        setError("Numero de telefono de 10 digitos")
        return;
    }

    fetch('http://localhost:3000/patients/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Datos que enviarás en el cuerpo de la solicitud
        name: patient.name,
        phone: patient.phone
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error en la solicitud');
      }
      return response.json();
    })
    .then(data => {
      console.log('Respuesta:', data);
    })
    .catch(error => {
      console.error('Error:', error);
    });

      setNewPatient(false)
      setPatient({name: '', phone: '998'})
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
            
              <div>
                <Dialog open={newPatient} onOpenChange={setNewPatient}>
                  <DialogTrigger asChild>
                    <Button onClick={handleNewPatient}>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Paciente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Crear Paciente</DialogTitle>
                        <DialogDescription>
                            Crea un nuevo Paciente.
                        </DialogDescription>
                    </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Nombre
                          </Label>
                          <Input
                            name='name'
                            defaultValue=""
                            value={patient.name}
                            onChange={handleChange}
                            required
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="telefono" className="text-right">
                          Telefono
                          </Label>
                          <Input
                            name='phone'
                            value={patient.phone}
                            onChange={handleChange}
                            className="col-span-3"
                          />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                      </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleSavePatient}>Guardar</Button>
                  </DialogFooter>
                  </DialogContent>
              </Dialog>
              </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
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
                      <TableCell>{patient.telefono}</TableCell>
                      <TableCell>{patient.Appointment && patient.Appointment.length > 0 ? patient.Appointment[0].startDate : "Sin citas"}</TableCell>
                      <TableCell>{patient.Appointment.length > 0 && patient.Appointment.length >= 2 ? patient.Appointment[1].startDate : "Sin citas"}</TableCell>
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