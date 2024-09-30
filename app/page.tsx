import NavBar from "./components/navBar"
import AutoCarrousel from "../app/components/auto_carrousel"
import Link from "next/link";
import Image from "next/image";

export default function Home() {


  return (
    <div className="flex flex-col min-h-screen">
      
      <NavBar/>
      
      {/* Encabezado */}
      <header className="bg-cover bg-center h-[40vh] w-full flex flex-col justify-center items-center text-white mb-5" style={{ backgroundImage: "url('https://cdn.pixabay.com/photo/2017/08/06/07/12/dentist-2589771_1280.jpg')" }}>
        <h1 className="text-4xl md:text-6xl font-bold text-sky-500">Bienvenido a Tu Clínica Dental</h1>
        <p className="mt-4 text-lg md:text-xl text-sky-500">Tu sonrisa es nuestra prioridad</p>
        <Link href="/contact" className="mt-6 bg-blue-600 text-white py-4 px-4 rounded hover:bg-blue-700 transition">Agenda tu cita</Link>
      </header>
      <AutoCarrousel/>
      {/* Sección de Servicios */}
      <section className="my-5 text-center">
        <h2 className="text-3xl font-semibold mb-6">Nuestros Servicios</h2>
        <div className="flex flex-wrap justify-center">
          <div className="max-w-xs mx-4 mb-6">
            <Image src="https://cdn.pixabay.com/photo/2022/08/19/21/15/dentist-7397735_1280.jpg" alt="Limpieza Dental" width={300} height={200} className="rounded" />
            <h3 className="text-xl font-medium mt-2">Limpieza Dental</h3>
            <p>Mantén tu sonrisa brillante y saludable.</p>
          </div>
          <div className="max-w-xs mx-4 mb-6">
            <Image src="https://cdn.pixabay.com/photo/2022/08/19/21/15/dentist-7397734_1280.jpg" alt="Blanqueamiento Dental" width={300} height={200} className="rounded" />
            <h3 className="text-xl font-medium mt-2">Blanqueamiento Dental</h3>
            <p>Recupera la blancura natural de tus dientes.</p>
          </div>
          <div className="max-w-xs mx-4 mb-6">
            <Image src="https://cdn.pixabay.com/photo/2020/08/27/18/30/teeth-5522650_1280.jpg" alt="Implantes Dentales" width={300} height={200} className="rounded" />
            <h3 className="text-xl font-medium mt-2">Implantes Dentales</h3>
            <p>Recupera la funcionalidad de tu sonrisa.</p>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="my-12 text-center">
        <h2 className="text-3xl font-semibold mb-6">Lo que dicen nuestros pacientes</h2>
        <div className="mb-6">
          <p className="italic">"El mejor servicio dental que he recibido. ¡Totalmente recomendable!"</p>
          <cite className="block mt-2">- Juan Pérez</cite>
        </div>
        <div>
          <p className="italic">"Profesionales y amables. Me sentí en buenas manos."</p>
          <cite className="block mt-2">- María López</cite>
        </div>
      </section>

      <footer className="bg-muted py-4 mt-8">
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Mi Sitio. Todos los derechos reservados.</p>
        </div>
      </footer>
  
  </div>
  );
}
