import Link from "next/link";

export default function NavBar(){

    return(
        <header className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            Mi Sitio
          </Link>
          <nav>
            <ul className="flex space-x-4">
              <li><Link href="/" className="hover:underline text-white">Inicio</Link></li>
              <li><Link href="/agenda" className="hover:underline text-white">Agenda</Link></li>
              <li><Link href="/pacientes" className="hover:underline text-white">Pacientes</Link></li>
              <li><Link href="/login" className="hover:underline text-white">Login</Link></li>
              <li><Link href="/productividad" className="hover:underline text-white">Productividad</Link></li>
            </ul>
          </nav>
        </div>
      </header>
    );
}