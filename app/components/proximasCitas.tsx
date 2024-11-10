import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react"
import CitasDentales from "./CitasDentales";

export default function ProximasCitas(){

    const [appointments, setAppointments] = useState([]);

    useEffect(()=>{
        const fetchAppointments = async ()=>{
            try {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            console.log(formattedDate);
            const data = await fetch(`http://localhost:3000/appointments/api?startDate=${formattedDate}`);
            const appointments = await data.json();
            console.log(appointments)
            setAppointments(appointments)
            } catch (error) {
                console.log(error)
            }  
        }
        
        if(appointments){
            console.log(appointments);
        }
        fetchAppointments()
    }, [])

    return (
        <div>
            <h1>Solo se Muestran Citas del Dia de hoy en adelante</h1>
             <CitasDentales citas={appointments}/>
        </div>
    )
}