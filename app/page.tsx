import AutoCarrousel from "../app/components/auto_carrousel"
import Image from "next/image";
import AgendarCitaBoton from "./components/agendarCitaBoton";
import Services from "./components/homePage/Services";
import Testimonios from "./components/homePage/Testimonios";
import AnimatedComponent from "./components/homePage/AnimatedComponent";

export default function Home() {


  return (
    <div className="flex flex-col min-h-screen">
      {/* Encabezado */}
      <div>
        <AutoCarrousel />
      </div>
      <section className="bg-gradient-to-r from-blue-500 to-green-400 py-12">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
              ¿Quienes somos?
            </h2>
            <p className="mt-4 text-lg md:text-xl text-white opacity-90">
            En Grupo Peninsular, somos más que una clínica dental: somos tu aliado para lograr una sonrisa 
            saludable y radiante. Nuestro equipo está compuesto por especialistas altamente capacitados que combinan 
            experiencia, tecnología de vanguardia y un enfoque humano para brindarte una atención integral y 
            personalizada.
            </p>
          </div>
        </section>
      {/* <div className="bg-white rounded-full">
          <h1 className="text-4xl md:text-6xl font-bold text-sky-500 text-center">Peninsular Grupo Medico y Dental</h1>
        </div> */}
      <div className="bg-cover bg-center h-[40vh] w-full flex flex-col justify-center items-center text-black mb-10" style={{ backgroundImage: "url('https://cdn.pixabay.com/photo/2017/08/06/07/12/dentist-2589771_1280.jpg')" }}>
        {/* <div className="mt-4 text-lg md:text-xl text-center">
          <h2>¿Quienes Somos?</h2>
          <p>
            En Grupo Peninsular, somos más que una clínica dental: somos tu aliado para lograr una sonrisa 
            saludable y radiante. Nuestro equipo está compuesto por especialistas altamente capacitados que combinan 
            experiencia, tecnología de vanguardia y un enfoque humano para brindarte una atención integral y 
            personalizada.
            </p>
        </div> */}
        

        <AgendarCitaBoton />
      </div>

      {/* Sección de Servicios */}
      <Services />

      {/* Testimonios */}
      <Testimonios />

      <AnimatedComponent />
      <footer className="bg-muted py-4 mt-8 bg-cyan-500">
        <div className="flex flex-col bg-cyan-500">
          <p className="text-center">¿Como llegar?</p>
          <iframe className="w-full" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.006706313101!2d-86.90054549999994!3d21.152131400000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f4c2b9a1dee0d7f%3A0x36ee4f3f80901a7c!2sOdontolog%C3%ADa%20Cosm%C3%A9tica%20Integral!5e0!3m2!1ses!2smx!4v1731451867673!5m2!1ses!2smx"
            width="500" height="300" style={{ border: 0 }} allowFullScreen={false} loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"></iframe>
        </div>
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Odontologia Cosmetica Integral. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
