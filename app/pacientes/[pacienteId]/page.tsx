"use client"
import { useState, useEffect } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import PerfilPaciente from "@/app/components/perfil_paciente"
import Odontogram from "../../components/Odontogram"

export default function patientDetails({params} : {
    params: {
        pacienteId: string
    }
}){

  const paciente = {
    id: '1',
    nombre: 'Juan',
    apellidos: 'Pérez García',
    telefono: '123456789',
    fechaNacimiento: '01/01/1980',
    email: 'juan@example.com',
    direccion: 'Calle Principal 123, Ciudad',
    foto: '/ruta/a/la/foto.jpg',
    historialClinico: [
      'Limpieza dental - 15/03/2023',
      'Empaste molar - 20/06/2023',
      'Revisión general - 10/09/2023'
    ],
    presupuestos: [
      { servicio: 'Limpieza dental', precio: 50 },
      { servicio: 'Blanqueamiento', precio: 200 },
      { servicio: 'Ortodoncia', precio: 2000 }
    ]
  }

    const pathName = usePathname()
    const searchParams = useSearchParams()
    const name = searchParams.get('name');

    useEffect(()=>{
        const someFunction = ()=>{
            const url = `${pathName}?${searchParams}`
            console.log(url)
            const fetch = new Promise((res, rej)=>{
                 setTimeout(()=>{
                     console.log(`fetching data with ${name}`)
                     res("Hey");     
                 }, 3000);   
            });
        }
         
        someFunction()

    }, []);

    return(
        <div>
          <PerfilPaciente paciente={paciente}/>
        </div>
    )
}