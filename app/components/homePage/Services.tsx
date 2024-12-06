import React from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const services = [
    {
        name: "Limpieza Dental",
        desc: "Mantén tu sonrisa brillante y saludable.",
        image: "https://cdn.pixabay.com/photo/2022/08/19/21/15/dentist-7397735_1280.jpg"
    },
    {
        name: "Blanqueamiento",
        desc: "Recupera la blancura natural de tus dientes.",
        image: "https://th.bing.com/th/id/OIP.aZC412aZE0gnPXxS8kJB8gHaE8?rs=1&pid=ImgDetMain"
    },
    {
        name: "Brackets tradicionales o invisibles",
        desc: "Corrección de problemas de alineación dental.",
        image: "https://th.bing.com/th/id/R.78a53b7bc740d6baf099a5d5e4793784?rik=wbl2o8Ud079oNQ&pid=ImgRaw&r=0"
    },
]

const Services = () => {
    return (
        <div className='grid justify-items-center'>
            <h2 className='text-2xl'>Nuestros Servicios</h2>
            {
                services.map((service, index) => (
                    <div className="w-full max-w-96 rounded-lg overflow-hidden shadow-md border bg-white md:grid-cols-2 m-2 md:max-w-50% mb-5">
                        {/* Imagen */}
                        <div className="relative w-full h-48">
                            <Image
                                src={service.image} // Cambia esto por la ruta de tu imagen
                                alt={service.desc}
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Contenido */}
                        <div className="p-4 bg-gradient-to-t from-blue-100 to-white">
                            <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {service.desc}
                            </p>
                            {/* Botón */}
                            <div className="mt-4">
                                {/* <Button className="bg-blue-600 text-white hover:bg-blue-700">
                                    Learn now!
                                </Button> */}
                            </div>
                        </div>
                    </div>))
            }
        </div>
    )
}

export default Services