"use client"

import Image from "next/image"
import WhatsappIcon from "../images/WhatsappIcon.png"

export default function AgendarCitaBoton() {
  const phoneNumber = "529981234567" // Cambiar por el número real
  const message = "¡Hola! Me gustaría agendar una cita."
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl transition-transform hover:scale-110 z-50 flex items-center justify-center"
      aria-label="Agendar cita por WhatsApp"
    >
      <Image src={WhatsappIcon} width={36} height={36} alt="WhatsApp" />
    </a>
  )
}
