"use client"
import Scheduler from "../../components/scheduler";
import { useEffect, useState } from "react";
import { authentication } from "@/app/actions/authentication";

export default async function Agenda(){

    const [isAdmin, setIsAdmin] = useState(false)
    useEffect(()=>{
        const fetchSession = async () => {

            const session = await authentication();
        
            if (session?.user?.role === "admin") {
              setIsAdmin(true);
            }
          };
          fetchSession();
    }, [])
  
    return(
        <div>
            {
            isAdmin ?   
            <Scheduler/> :
            <p>usted no eres administrador</p>
            }
        </div>
    );
}