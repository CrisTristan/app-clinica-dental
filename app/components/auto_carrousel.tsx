"use client"

import { useState, useEffect } from 'react'
import { SlArrowLeft, SlArrowRight } from "react-icons/sl"
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { CldUploadWidget, CldImage } from 'next-cloudinary'
import { authentication } from '../actions/authentication'
import { getAllAddvertisements } from '../actions/getAllAddvertisements'
import { ImageFormat } from '../types/types'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

export default function AutoCarrousel() {
  const [advertisements, setAdvertisements] = useState<ImageFormat[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    getAllAddvertisements().then((ads: ImageFormat[]) => setAdvertisements(ads))
    authentication().then(session => {
      if (session?.user?.role === "admin") setIsAdmin(true)
    })
  }, [])

  useEffect(() => {
    if (advertisements.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % advertisements.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [advertisements.length])

  const nextSlide = () => setCurrentIndex(prev => (prev + 1) % advertisements.length)
  const prevSlide = () => setCurrentIndex(prev => (prev - 1 + advertisements.length) % advertisements.length)

  let startX = 0
  const handleTouchStart = (e: React.TouchEvent) => { startX = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - startX
    if (Math.abs(diff) > 50) diff > 0 ? prevSlide() : nextSlide()
  }

  if (advertisements.length === 0) {
    return (
      <div className="relative w-full h-[70vh] bg-gradient-to-br from-blue-700 to-teal-500 flex items-center justify-center">
        <div className="text-center text-white px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">Tu sonrisa, nuestra pasión</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-xl mx-auto">
            Atención dental de calidad con tecnología de vanguardia y un equipo comprometido con tu bienestar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-[70vh] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {advertisements.map(({ url, width, height }, index) => (
          <Dialog key={url}>
            <DialogTrigger asChild>
              <div className="relative min-w-full h-full cursor-pointer bg-gray-900 flex items-center justify-center">
                <Image
                  src={url}
                  width={width}
                  height={height}
                  className="max-h-full max-w-full object-contain"
                  alt={`Publicidad ${index + 1}`}
                />
              </div>
            </DialogTrigger>
            <DialogContent className="flex justify-center items-center sm:max-w-[850px] p-4">
              <Image src={url} width={width} height={height} className="max-h-[80vh] w-auto object-contain" alt="" />
            </DialogContent>
          </Dialog>
        ))}
      </div>

      <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-md transition" aria-label="Anterior">
        <SlArrowLeft />
      </button>
      <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-3 shadow-md transition" aria-label="Siguiente">
        <SlArrowRight />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {advertisements.map((_, i) => (
          <button key={i} onClick={() => setCurrentIndex(i)}
            className={`w-3 h-3 rounded-full transition ${i === currentIndex ? 'bg-white' : 'bg-white/50'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {isAdmin && (
        <div className="absolute top-4 right-4">
          <CldUploadWidget
            uploadPreset="dental_preset"
            onSuccess={(result) => {
              if (result.info && typeof result.info === 'object') {
                setAdvertisements(prev => [...prev, result.info as ImageFormat])
              }
            }}
          >
            {({ open }) => (
              <Button onClick={() => open()} className="bg-white text-blue-600 hover:bg-blue-50 shadow">
                + Subir imagen
              </Button>
            )}
          </CldUploadWidget>
        </div>
      )}
    </div>
  )
}
