"use client"

import { useState, useEffect } from 'react'
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import Imagen1 from '../images/shutterstock.jpg';
import Image from 'next/image';

const images = [
  "https://cdn.pixabay.com/photo/2024/02/16/06/26/dentist-8576790_1280.png",
  "https://cdn.pixabay.com/photo/2016/09/02/16/17/dentist-1639683_1280.jpg",
  "https://cdn.pixabay.com/photo/2024/04/30/07/18/dentist-8729627_1280.jpg",
  "https://cdn.pixabay.com/photo/2024/06/28/04/30/preventive-dentistry-8858477_1280.jpg",
]

export default function AutoCarrousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide()
    }, 3000) // Cambia de imagen cada 3 segundos

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="overflow-hidden rounded-lg shadow-lg">
        <div 
          className="flex transition-transform duration-500 ease-in-out" 
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((src, index) => (
            <Image
              key={index} 
              src={src}
              width={500}
              height={500}
              alt={`Slide ${index + 1}`} 
              className="w-full h-auto flex-shrink-0"
            />
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
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}