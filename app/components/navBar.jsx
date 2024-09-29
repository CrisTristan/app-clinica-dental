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
              <li><Link href="/" className="hover:underline">Inicio</Link></li>
              <li><Link href="/agenda" className="hover:underline">Agenda</Link></li>
              <li><Link href="/pacientes" className="hover:underline">Pacientes</Link></li>
              <li><Link href="/login" className="hover:underline">Login</Link></li>
            </ul>
          </nav>
        </div>
      </header>
    );
}