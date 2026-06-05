import Image from 'next/image'

const testimonies = [
  {
    name: "María Gómez",
    role: "Paciente desde 2021",
    testimonie: "Llegué con un fuerte dolor de muelas y salí completamente aliviada. La atención fue rápida, amable y efectiva. Son los mejores.",
    image: "https://i.pravatar.cc/400?img=49",
    stars: 5
  },
  {
    name: "Eduardo Martínez",
    role: "Paciente desde 2022",
    testimonie: "El ambiente es moderno y relajante. La limpieza dental que me hicieron fue excelente y los precios son muy accesibles. ¡Gran experiencia!",
    image: "https://i.pravatar.cc/400?img=52",
    stars: 5
  },
  {
    name: "Laura Sánchez",
    role: "Mamá de paciente",
    testimonie: "Mi hija tenía mucho miedo al dentista, pero el equipo hizo que se sintiera cómoda y segura. Ahora está emocionada por sus visitas.",
    image: "https://i.pravatar.cc/400?img=38",
    stars: 5
  },
  {
    name: "José Hernández",
    role: "Paciente desde 2023",
    testimonie: "Nunca había disfrutado ir al dentista. Mis dientes lucen perfectos después del blanqueamiento. ¡Los recomiendo al 100%!",
    image: "https://i.pravatar.cc/400?img=12",
    stars: 5
  }
]

const Stars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5 mb-3">
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="text-yellow-400 text-lg">★</span>
    ))}
  </div>
)

const Testimonios = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-widest">Lo que dicen</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2">Testimonios</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            La satisfacción de nuestros pacientes es nuestra mayor recompensa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonies.map((t, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
              <Stars count={t.stars} />
              <p className="text-gray-600 text-sm leading-relaxed flex-1">"{t.testimonie}"</p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-200">
                <Image
                  src={t.image}
                  alt={t.name}
                  width={44}
                  height={44}
                  className="rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                  <p className="text-gray-400 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonios
