"use client"

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useCallback, useEffect, useRef, startTransition, useTransition } from 'react'
import { useDropzone } from 'react-dropzone'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { X, Edit, Save } from "lucide-react"
import Odontogram from './Odontogram'
import { Patient } from '../types/types'
import { uploadImage } from '../actions/uploadImage'
import { getProfilePhoto } from '../actions/getProfilePhoto'
import {CldUploadWidget, CldImage} from "next-cloudinary"
import { getAllPatientImages } from '../actions/getAllImages'
import { deleteOneImage } from '../actions/deleteOneImage'
import DeleteButtonNotify from './deleteButtonNotify'
import ManageBudgets from './ManageBudgets'

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

export default function PerfilPaciente({ paciente, nombre, id }: { paciente: Patient, nombre: string, id: number }) {

  const pathPatientFolder = `/pacientes/${nombre+"_"+id}`
  useEffect(() => {

    
    if (paciente) { // Verifica que paciente no sea undefined o null
      setPatient(paciente);
      const entries = Object.entries(paciente);
      console.log(entries);
      const url = getProfilePhoto(nombre, id)
      url.then(res=> setPatient(prev => ({...prev, foto: res})));
      const images = getAllPatientImages(nombre, id)
      images.then(res => setArchivos(res))
    }

  }, [paciente]);

  

  const [patient, setPatient] = useState<Patient>(); //estado del paciente, contiente todos los datos del mismo.
  const [archivos, setArchivos] = useState<string[]>([]) //se hizo un cambio en el tipo useState()
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(null)
  const [editPatientProfile, setEditPatientProfile] = useState(false);
  const [editando, setEditando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  //const [fullNameNoSpaces, setFullNameNoSpaces] = useState("")


  const handleInputDataPatient = (e)=>{
    const { name, value} = e.target;
    const listId = e.target.getAttribute('list');

    setPatient((prevPatient) => ({
      ...prevPatient,
      [name || listId]: value,
    }));
  }

  const handleDeleteImage = (url)=>{
    deleteOneImage(url)
  }

  const onDrop = useCallback((acceptedFiles: string[]) => {
    setArchivos(prevArchivos => [...prevArchivos, ...acceptedFiles])
    console.log(acceptedFiles);
  }, [])

  const onImageClick = (url: string) => {
    setImagenSeleccionada(url)
  }

  const handleEditClick= ()=>{
    setEditPatientProfile(prev => !prev)
  }

  const handleSaveClick = ()=>{
    console.log(patient);
    fetch('http://localhost:3000/patients/api', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Datos que enviarás en el cuerpo de la solicitud
        id: patient?.id,
        name: patient?.name,
        apellido_pat: patient?.apellido_pat,
        apellido_mat: patient?.apellido_mat,
        edad: patient?.edad,
        domicilio: patient?.domicilio,
        sexo: patient?.sexo
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error en la solicitud');
      }
      return response.json();
    }).catch(error => {
      console.log(error);
    })


  }

  const onPhotoChange = (url: URL) => {

    if (url) {
        setPatient(prev => ({ ...prev, foto: url })) //Actualizamos el estado 
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Perfil del Paciente</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sección 1: Foto del paciente */}
        <Card className='grid place-content-center'>
          <CardHeader>
            <CardTitle className='text-center'>Foto del Paciente</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col justify-center'>
            <Image
              src={patient?.foto}
              alt={`Foto de ${patient?.name} ${paciente?.apellido_pat}`}
              width={500}
              height={500}
              className="rounded-full"
            />
            <CldUploadWidget signatureEndpoint="/api/sign-cloudinary-params"
            options={{sources: ['local', 'url', 'google_drive', 'camera'], folder: pathPatientFolder+"/fotoPerfil", tags: ['encias']}}
            onSuccess={(results)=> onPhotoChange(results.info?.url)}
            >
              {({ open }) => {
              return (
                <button 
                  className='bg-cyan-400 rounded-lg py-2'
                  onClick={() => open()}>
                  Cambiar foto Perfil
                </button>
              );
              }}
          </CldUploadWidget>
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
              {patient && Object.entries(patient).map(([key, value]) => {
                  if (['id', 'foto', 'historialClinico', 'servicios'].includes(key)) return null
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1)}</TableCell>
                      <TableCell>
                          {key === 'telefono' ? <Input disabled={true} name={key} value={value}/> :
                          key === 'sexo' ?
                          <div> 
                          <input list="sexo" onChange={handleInputDataPatient} /> 
                          <datalist id="sexo">
                            <option value='Masculino'/>
                            <option value='Femenino'/>
                          </datalist>
                          </div>
                          :
                          <Input
                            //disabled={!editPatientProfile}
                            name={key}
                            value={value}
                            onChange={handleInputDataPatient}
                          />
                          }
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className='mt-4 flex space-between'>
            {/* <Button onClick={handleEditClick} variant="outline" size="sm"> */}
                {/* <Edit className="w-4 h-4 mr-2" /> Editar */}
            {/* </Button> */}
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
        <Card className="md:col-span-3 h-80">
        <Odontogram/>
        </Card>
        {/* Sección 4: Presupuestos */}
        <Card className="md:col-span-2 mt-8">
          {/* <CardHeader>
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
          </CardContent> */}
          <ManageBudgets id={id}/>
        </Card>

        {/* Sección 5: Archivos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Archivos</CardTitle>
          </CardHeader>
          <CardContent>
          <div className='grid place-content-center mb-5'>
          <CldUploadWidget signatureEndpoint="/api/sign-cloudinary-params"
            onSuccess={(results)=> setArchivos(prev=> [...prev,results.info?.url])}
            options={{sources: ['local', 'url', 'google_drive', 'camera'], folder: pathPatientFolder, tags: ['encias']}}
          >
              {({ open }) => {
              return (
                <button 
                  className='bg-cyan-400 rounded-lg px-20 py-5'
                  onClick={() => open()}>
                  Guardar Imagen
                </button>
              );
              }}
          </CldUploadWidget>
          
          </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {archivos.map((URL, index) => (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div className="relative cursor-pointer" onClick={() => onImageClick(URL)}>
                      <CldImage
                        src={URL}
                        alt={`Archivo ${index + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover w-full h-40"
                      />
                      <p className="mt-2 text-sm text-center truncate">{}</p>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[1500px] sm:max-h-[120vh]">
                    <div className="relative w-full h-full">
                      <Image
                        src={URL}
                        alt={`Vista ampliada de`}
                        layout="responsive"
                        width={1200}
                        height={1000}
                        objectFit="contain"
                      />
                      {/* <Button  */}
                        {/* variant="destructive" */}
                        {/* onClick={()=> handleDeleteImage(URL)}> */}
                         {/* Borrar Imagen */}
                      {/* </Button> */}
                      <DeleteButtonNotify onDelete={()=> deleteOneImage(URL)} nextAction={()=> setImagenSeleccionada}/>
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