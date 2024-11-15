"use client"
import Scheduler from "../../components/scheduler";
import { useEffect, useState } from "react";
import { authentication } from "@/app/actions/authentication";

export default function Agenda(){

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
            true ?   
            <Scheduler/> :
            <p>usted no eres administrador</p>
            }
        </div>
    );
}