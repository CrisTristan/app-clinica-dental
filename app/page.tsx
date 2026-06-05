import AutoCarrousel from "./components/auto_carrousel"
import AgendarCitaBoton from "./components/agendarCitaBoton"
import Services from "./components/homePage/Services"
import Testimonios from "./components/homePage/Testimonios"

const stats = [
  { value: "10+", label: "Años de experiencia" },
  { value: "3,000+", label: "Pacientes atendidos" },
  { value: "6", label: "Especialidades" },
  { value: "100%", label: "Satisfacción garantizada" },
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* Hero — carrusel a pantalla completa */}
      <AutoCarrousel />

      {/* Quiénes somos */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-widest">Sobre nosotros</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2 mb-4">
                Más que una clínica, tu aliado para sonreír
              </h2>
              <p className="text-gray-500 leading-relaxed">
                En Grupo Peninsular somos especialistas altamente capacitados que combinan experiencia,
                tecnología de vanguardia y un enfoque humano para brindarte una atención integral y
                personalizada. Tu salud bucal es nuestra prioridad.
              </p>
              <a
                href="#servicios"
                className="inline-block mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full transition"
              >
                Ver servicios
              </a>
            </div>
            <div className="flex-1 w-full h-72 relative rounded-2xl overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://cdn.pixabay.com/photo/2017/08/06/07/12/dentist-2589771_1280.jpg"
                alt="Clínica dental"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-r from-blue-600 to-teal-500 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl font-bold drop-shadow">{stat.value}</p>
                <p className="text-sm opacity-80 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Servicios */}
      <div id="servicios">
        <Services />
      </div>

      {/* Testimonios */}
      <Testimonios />

      {/* CTA final */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">¿Listo para tu primera visita?</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Agenda tu cita hoy mismo. Nuestro equipo está listo para atenderte.
          </p>
          <a
            href={`https://wa.me/529981234567?text=${encodeURIComponent("¡Hola! Me gustaría agendar una cita.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-full shadow-lg transition-transform hover:scale-105 text-lg"
          >
            📲 Agendar por WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white pt-10 pb-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">Grupo Peninsular</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Odontología Cosmética Integral. Atención profesional, cálida y con los más altos estándares de calidad.
              </p>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">Contacto</h3>
              <p className="text-gray-400 text-sm">📞 +52 998 123 4567</p>
              <p className="text-gray-400 text-sm mt-1">📧 contacto@grupopeninsular.com</p>
              <p className="text-gray-400 text-sm mt-1">📍 Cancún, Quintana Roo, México</p>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">¿Cómo llegar?</h3>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.006706313101!2d-86.90054549999994!3d21.152131400000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f4c2b9a1dee0d7f%3A0x36ee4f3f80901a7c!2sOdontolog%C3%ADa%20Cosm%C3%A9tica%20Integral!5e0!3m2!1ses!2smx!4v1731451867673!5m2!1ses!2smx"
                className="w-full h-40 rounded-lg"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Odontología Cosmética Integral. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <AgendarCitaBoton />

    </div>
  )
}
