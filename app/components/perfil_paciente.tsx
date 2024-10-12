"use client"

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { X, Edit, Save } from "lucide-react"
import Odontogram from './Odontogram'
import { Patient } from '../types/types'

/*interface Paciente {
  id: string
  nombre: string
  apellidos: string
  telefono: string
  fechaNacimiento: string
  email: string
  direccion: string
  foto: string
  historialClinico: string[]
  presupuestos: { servicio: string; precio: number }[]
}*/

export default function PerfilPaciente({ paciente }: { paciente: Patient }) {

  useEffect(()=>{
    //Inicializamos el estado del paciente.
    setPatient(paciente);
  }, [paciente]);

  const [patient, setPatient] = useState<Patient>(); //estado del paciente, contiente todos los datos del mismo.
  const [archivos, setArchivos] = useState<File[]>([])
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null)
  const [editPatientProfile, setEditPatientProfile] = useState(false);

  

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setArchivos(prevArchivos => [...prevArchivos, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const onImageClick = (file: File) => {
    setImagenSeleccionada(URL.createObjectURL(file))
  }

  const handleEditClick= ()=>{
    setEditPatientProfile(prev => !prev)
  }

  const handleSaveClick = ()=>{
    
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Perfil del Paciente</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sección 1: Foto del paciente */}
        <Card>
          <CardHeader>
            <CardTitle>Foto del Paciente</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Image
              src={patient?.foto}
              alt={`Foto de ${patient?.name} ${paciente?.ape_pat}`}
              width={200}
              height={200}
              className="rounded-full"
            />
          </CardContent>
        </Card>

        {/* Sección 2: Datos personales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Nombre</TableCell>
                  <Input
                    disabled={!editPatientProfile} 
                    value={patient?.name}
                  />
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Apellidos</TableCell>
                  <Input
                    disabled={!editPatientProfile} 
                    value={patient?.ape_pat}
                  />
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Teléfono</TableCell>
                  <Input
                    disabled={!editPatientProfile} 
                    value={patient?.telefono}
                  />
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Fecha de Nacimiento</TableCell>
                  <Input
                    disabled={!editPatientProfile} 
                    value={patient?.fechaNacimiento}
                  />
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Email</TableCell>
                  <Input
                    disabled={!editPatientProfile} 
                    value={patient?.fechaNacimiento}
                  />
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Dirección</TableCell>
                  <Input
                    disabled={!editPatientProfile} 
                    value={patient?.direccion}
                  />
                </TableRow>
              </TableBody>
            </Table>
            <div className='mt-4 flex space-between'>
            <Button onClick={handleEditClick} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
            <Button onClick={handleSaveClick} variant="outline" size="sm">
                <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sección 3: Historial clínico */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Historial Clínico</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5">
              {paciente?.historialClinico?.map((item, index) => (
                <li key={index} className="mb-2">{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent>
              <Odontogram/>
          </CardContent>
        </Card>

        {/* Sección 4: Presupuestos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Presupuestos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paciente?.presupuestos?.map((presupuesto, index) => (
                  <TableRow key={index}>
                    <TableCell>{presupuesto.servicio}</TableCell>
                    <TableCell className="text-right">{presupuesto.precio.toFixed(2)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sección 5: Archivos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Archivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
                isDragActive ? 'border-primary' : 'border-gray-300'
              }`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>Suelta los archivos aquí ...</p>
              ) : (
                <p>Arrastra y suelta algunos archivos aquí, o haz clic para seleccionar archivos</p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {archivos.map((file, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div className="relative cursor-pointer" onClick={() => onImageClick(file)}>
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Archivo ${index + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover w-full h-40"
                      />
                      <p className="mt-2 text-sm text-center truncate">{file.name}</p>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[1500px] sm:max-h-[120vh]">
                    <div className="relative w-full h-full">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Vista ampliada de ${file.name}`}
                        layout="responsive"
                        width={1200}
                        height={1000}
                        objectFit="contain"
                      />
                    </div>
                    <button
                      onClick={() => setImagenSeleccionada(null)}
                      className="absolute top-2 right-2 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}