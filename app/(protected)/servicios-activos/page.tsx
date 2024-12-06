"use client"

import {auth} from "@/auth"
import ServiciosActivos from "../../components/patient_service"
import { useEffect, useState } from "react";
import { PatientService } from "@/app/types/types";

const patients = [
    {
      name: "John Doe",
      activeService: "Root Canal",
      totalCost: 1200,
      balance: 800,
    },
    {
      name: "Jane Smith",
      activeService: "Teeth Whitening",
      totalCost: 500,
      balance: 200,
    },
    {
      name: "Mike Johnson",
      activeService: "Dental Implant",
      totalCost: 3000,
      balance: 1500,
    },
]

export default function AdminPage(){

    //const session = await auth();
    const [activeServices, setActiveServices] = useState<PatientService[]>([]);
    
    useEffect(()=>{
        const fetchActiveServices = ()=>{
            const response = fetch('/patients/api')
            response.then(data => {
              return data.json()
            }).then(data=>{
                console.log(data)
                data.map((patient)=>{
                    if(patient.servicios.length > 0){
                        
                        patient.servicios.map((service)=>{
                            setActiveServices(prev=> [...prev, {
                                name: patient.name,
                                activeService: service.name,
                                totalCost: service.price,
                                balance: service.balance,
                            }])
                        })

                        
                    }
                })

            }).catch(error=>{
                console.log(error)
            })   
        }
        fetchActiveServices();
    }, [])
    // if(session?.user?.role !== "admin"){
    //     return <div>Tu no eres Admin</div>
    // }

    return (
    <div>
        {activeServices?.map((patient, index) => (
          <ServiciosActivos key={index} {...patient} />
        ))}
    </div>
    )
}