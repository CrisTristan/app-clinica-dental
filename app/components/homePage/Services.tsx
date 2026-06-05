import Image from 'next/image'

const services = [
  {
    name: "Limpieza Dental",
    desc: "Eliminamos sarro y placa bacteriana para mantener tus encías y dientes en óptimas condiciones.",
    image: "https://cdn.pixabay.com/photo/2022/08/19/21/15/dentist-7397735_1280.jpg",
    icon: "🦷"
  },
  {
    name: "Blanqueamiento",
    desc: "Recupera el blanco natural de tus dientes con nuestros tratamientos seguros y efectivos.",
    image: "https://th.bing.com/th/id/OIP.aZC412aZE0gnPXxS8kJB8gHaE8?rs=1&pid=ImgDetMain",
    icon: "✨"
  },
  {
    name: "Ortodoncia",
    desc: "Brackets tradicionales o invisibles para corregir la alineación y mejorar tu mordida.",
    image: "https://th.bing.com/th/id/R.78a53b7bc740d6baf099a5d5e4793784?rik=wbl2o8Ud079oNQ&pid=ImgRaw&r=0",
    icon: "😁"
  },
  {
    name: "Implantes Dentales",
    desc: "Reemplaza dientes perdidos con implantes que lucen y funcionan como dientes naturales.",
    image: "https://cdn.pixabay.com/photo/2017/08/06/07/12/dentist-2589771_1280.jpg",
    icon: "🔬"
  },
  {
    name: "Endodoncia",
    desc: "Tratamiento de conducto para eliminar infecciones y salvar dientes dañados.",
    image: "https://cdn.pixabay.com/photo/2024/02/16/06/26/dentist-8576790_1280.png",
    icon: "💉"
  },
  {
    name: "Odontología Pediátrica",
    desc: "Atención especializada para los más pequeños en un ambiente seguro y amigable.",
    image: "https://cdn.pixabay.com/photo/2016/09/02/16/17/dentist-1639683_1280.jpg",
    icon: "👶"
  },
]

const Services = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-widest">Lo que ofrecemos</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2">Nuestros Servicios</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Contamos con una amplia gama de tratamientos para cuidar tu salud bucal en todas las etapas de tu vida.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-3 left-3 text-2xl">{service.icon}</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{service.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
