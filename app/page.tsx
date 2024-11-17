import AutoCarrousel from "../app/components/auto_carrousel"
import Image from "next/image";
import AgendarCitaBoton from "./components/agendarCitaBoton";

export default function Home() {


  return (
    <div className="flex flex-col min-h-screen">
      {/* Encabezado */}
      <header className="bg-cover bg-center h-[40vh] w-full flex flex-col justify-center items-center text-white mb-10" style={{ backgroundImage: "url('https://cdn.pixabay.com/photo/2017/08/06/07/12/dentist-2589771_1280.jpg')" }}>
      <div className="bg-white rounded-full">
          <h1 className="text-4xl md:text-6xl font-bold text-sky-500 text-center">Bienvenido a Tu Clínica Dental</h1>
      </div>
        <Image
            className="rounded-lg m-2"
            src={"https://pps.whatsapp.net/v/t61.24694-24/425259624_447106951131452_1908375958700733170_n.jpg?ccb=11-4&oh=01_Q5AaIBl1n_6am-6W69Zg_DUlvE0MxSAeppttaucIimeAMJNW&oe=6737BB74&_nc_sid=5e03e0&_nc_cat=101"}
            width={200}
            height={200}
            alt=""
        />
        <div className="bg-white rounded-full m-5">
        <p className="mt-4 text-lg md:text-xl text-sky-500">Tu sonrisa es nuestra prioridad</p>
        </div>
        <AgendarCitaBoton/>
      </header>
      <div>
      <AutoCarrousel/>
      </div>
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
      {/* <section className="my-12 text-center">
        <h2 className="text-3xl font-semibold mb-6">Lo que dicen nuestros pacientes</h2>
        <div className="mb-6">
          <p className="italic">"El mejor servicio dental que he recibido. ¡Totalmente recomendable!"</p>
          <cite className="block mt-2">- Juan Pérez</cite>
        </div>
        <div>
          <p className="italic">"Profesionales y amables. Me sentí en buenas manos."</p>
          <cite className="block mt-2">- María López</cite>
        </div>
      </section> */}

      <footer className="bg-muted py-4 mt-8">
        <div className="flex flex-col bg-cyan-500">
        <p className="text-center">¿Como llegar?</p>
        <iframe className="w-full" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.006706313101!2d-86.90054549999994!3d21.152131400000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f4c2b9a1dee0d7f%3A0x36ee4f3f80901a7c!2sOdontolog%C3%ADa%20Cosm%C3%A9tica%20Integral!5e0!3m2!1ses!2smx!4v1731451867673!5m2!1ses!2smx" 
        width="600" height="450" style={{border:0}} allowFullScreen={true} loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade"></iframe>
        </div>
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Mi Sitio. Todos los derechos reservados.</p>
        </div>
      </footer>
  
  </div>
  );
}
