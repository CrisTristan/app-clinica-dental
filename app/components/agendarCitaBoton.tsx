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
      className="fixed bottom-4 right-4 bg-green-500 hover:bg-green-600 text-white p-6 rounded-full shadow-lg transition transform hover:scale-150 z-50"
    >
      <Image
        src={WhatsappIcon}
        width={50}
        height={50}
        alt="whatsapp"
      />
    </Button>
  );
}
