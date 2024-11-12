import Link from "next/link";
import { authentication } from "../actions/authentication";
import { auth } from "@/auth";
import { SignOut } from "./signOut";
import Image from "next/image";
export default async function NavBar(){

    const session = await auth();

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
              <li>{ !session ? <Link href="/login" className="hover:underline text-white">Login</Link> : <SignOut/>}</li>
              <li>
                {
                session?.user?.role === "admin" &&
                <Link href="/agenda" className="hover:underline text-white">Agenda</Link>
                }
              </li>
              <li>
                {
                session?.user?.role === "admin" &&
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