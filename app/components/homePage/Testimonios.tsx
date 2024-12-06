import React from 'react'
import Image from 'next/image'

const testimonies = [
  {
    name: "María Gómez",
    testimonie: "Llegué a Odontologia Cosmetica Integral con un fuerte dolor de muelas y salí completamente aliviado. La atención fue rápida, amable y efectiva. Son los mejores.",
    image: "https://i.pravatar.cc/400?img=49"
  },
  {
    name:"Eduardo Martínez",
    testimonie: "El ambiente en Odontologia Cosmetica Integral es moderno y relajante. La limpieza dental que me hicieron fue excelente, y los precios son muy accesibles. ¡Gran experiencia!",
    image: "https://i.pravatar.cc/400?img=52"
  },
  {
     name: "Laura Sánchez",
     testimonie: "Mi hija tenía mucho miedo al dentista, pero el equipo de Odontologia Cosmetica Integral hizo que se sintiera cómoda y segura. Ahora está emocionada por sus visitas regulares.",
     image: "https://i.pravatar.cc/400?img=38"
  },
  {
    name: "Jose Hernandez",
    testimonie: "Nunca había disfrutado ir al dentista hasta que conocí a los especialistas de Odontologia Cosmetica Integral. Mis dientes lucen perfectos después de su tratamiento de blanqueamiento. ¡Los recomiendo al 100%!",
    image: "https://i.pravatar.cc/400?img=12"
  }

]
const Testimonios = () => {
  return (
    <div>
    {
    testimonies.map((testimonie)=>(
      <div className="max-w-xl mx-auto p-6 bg-gray-100 rounded-lg mb-3">
      {/* Imagen del cliente */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-full">
          <Image
            src={testimonie.image}
            alt="Sophia Ramirez"
            width={48}
            height={48}
            className=""
          />
        </div>
      </div>
      {/* Texto del Testimonio */}
      <p className="text-gray-700 text-lg">
        {testimonie.testimonie}
      </p>
      <div>
          <p className="font-semibold text-gray-800">{testimonie.name}</p>
       </div>
    </div>
    ))
    }
    
    </div>
  )
}

export default Testimonios