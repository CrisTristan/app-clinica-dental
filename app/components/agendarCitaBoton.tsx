"use client"

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import WhatsappIcon from "../images/WhatsappIcon.png"
export default function AgendarCitaBoton() {
  const phoneNumber = "5219983218141"; // Número de WhatsApp con el prefijo internacional
  const message = "¡Hola! Me gustaría agendar una cita."; // Mensaje predefinido

  const router = useRouter();
  // Crear URL de WhatsApp con el número y el mensaje
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <Button
      onClick={() => router.push(whatsappUrl)}
      className="px-4 py-6 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition duration-300"
    >
      <Image
        src={WhatsappIcon}
        width={25}
        height={25}
        alt=""
      />
      Agendar Cita
    </Button>
  );
}
