"use client"

import Link from "next/link";
import { authentication } from "../actions/authentication";
import { SignOut } from "./signOut";
import Image from "next/image";
import { useEffect, useState } from "react";
export default function NavBar(){

    const [UserSession, setUserSession] = useState();

    useEffect(() => {
      const fetchSession = async () => {
          const session = await authentication();
          console.log(session);
          setUserSession(session);
      };

      // Solo activa el intervalo si UserSession es nulo o no está definido
      if (!UserSession) {
          const intervalId = setInterval(fetchSession, 3000);

          // Limpia el intervalo cuando el componente se desmonta o si UserSession cambia
          return () => clearInterval(intervalId);
      }
  }, [UserSession]); // Dependencia en UserSession

    return(
        <header className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            <Image
              src={"https://th.bing.com/th/id/OIP.SOLDwLuhaxavlwt3TOunUwHaHa?rs=1&pid=ImgDetMain"}
              width={100}
              height={100}
            />
          </Link>
          <nav>
            <ul className="flex space-x-4">
              <li><Link href="/" className="hover:underline text-white">Inicio</Link></li>
              <li>{ !UserSession ? <Link href="/login" className="hover:underline text-white">Login</Link> : <SignOut/>}</li>
              <li>
                {
                UserSession?.user?.role === "admin" &&
                <Link href="/agenda" className="hover:underline text-white">Agenda</Link>
                }
              </li>
              <li>
                {
                UserSession?.user?.role === "admin" &&
                <Link href="/pacientes" className="hover:underline text-white">Panel Admin</Link>
                }
              </li>
              {/* <li><Link href="/productividad" className="hover:underline text-white">Productividad</Link></li> */}
            </ul>
          </nav>
        </div>
      </header>
    );
}