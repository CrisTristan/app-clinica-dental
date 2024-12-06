"use client"

import { auth } from '@/auth';
import { useState, useEffect } from 'react'
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import Imagen1 from '../images/shutterstock.jpg';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CldUploadWidget, CldImage } from 'next-cloudinary';
import { isGeneratorFunction } from 'util/types';
import { authentication } from '../actions/authentication';
import { getAllAddvertisements } from '../actions/getAllAddvertisements';
import { ImageFormat } from '../types/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/*const images : string[] = [
  "https://cdn.pixabay.com/photo/2024/02/16/06/26/dentist-8576790_1280.png",
  "https://cdn.pixabay.com/photo/2016/09/02/16/17/dentist-1639683_1280.jpg",
  "https://cdn.pixabay.com/photo/2024/04/30/07/18/dentist-8729627_1280.jpg",
  "https://cdn.pixabay.com/photo/2024/06/28/04/30/preventive-dentistry-8858477_1280.jpg",
]*/

export default function AutoCarrousel() {

  const [Addvertisments, setAddvertisements] = useState<ImageFormat[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(()=>{
    const fetchAddvertisements = async () => {
      const adds : ImageFormat[] = await getAllAddvertisements();
      setAddvertisements(adds);

      console.log(adds);
    };
    fetchAddvertisements();
  }, []);

  useEffect(() => {
    const fetchSession = async () => {

      const session = await authentication();
  
      if (session?.user?.role === "admin") {
        setIsAdmin(true);
      }
    };
    fetchSession();
    
    // Solo iniciar el intervalo si hay imágenes
    if (Addvertisments.length > 0) {
      const interval = setInterval(() => {
        nextSlide();
      }, 5000); // Cambia de imagen cada 3 segundos
  
      return () => clearInterval(interval); // Limpiar el intervalo
    }
  }, [Addvertisments]); // Escucha cambios en Addvertisments

  const handleAddAdvertisment = (url : URL)=>{
      console.log(url)
      console.log(Addvertisments)
      setAddvertisements(prevURLs => [...prevURLs, url])
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % Addvertisments?.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + Addvertisments?.length) % Addvertisments?.length)
  }

  // Variables para manejar gestos táctiles
  let startX = 0;

  const handleTouchStart = (e) => {
    startX = e.touches[0].clientX; // Captura la posición inicial
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX; // Captura la posición final
    const diffX = endX - startX;

    if (Math.abs(diffX) > 50) {
      // Determina la dirección del deslizamiento
      if (diffX > 0) {
        prevSlide(); // Desliza a la derecha
      } else {
        nextSlide(); // Desliza a la izquierda
      }
    }
  };

  return (
    <div
      className="relative w-full max-w-xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden rounded-lg shadow-lg">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {Addvertisments.map(({ url, width, height }, index) => (
            <Dialog key={url}>
              <DialogTrigger asChild>
                <Image className="h-[40vh]" src={url} width={width} height={height} alt="" />
              </DialogTrigger>
              <DialogContent className="flex justify-center items-center sm:max-w-[850px] p-4">
                <Image
                  className="h-[60vh]"
                  src={url}
                  width={width * 2}
                  height={height * 2}
                  alt=""
                />
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md"
        aria-label="Previous slide"
      >
        <SlArrowLeft />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md"
        aria-label="Next slide"
      >
        <SlArrowRight />
      </button>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 mb-10">
        {Addvertisments.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex ? 'bg-stone-600' : 'bg-stone-500/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}