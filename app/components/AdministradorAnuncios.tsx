'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Upload, Save } from 'lucide-react'
import { getAllAddvertisements } from '../actions/getAllAddvertisements'
import { ImageFormat } from '../types/types'
import Image from 'next/image'
import { deleteAddversitesment } from '../actions/deleteAddvertisement'
import { CldUploadWidget } from 'next-cloudinary'

export default function AdministradorAnuncios() {

  useEffect(()=>{
    const fetchAddvertisements = async () => {
      const adds : ImageFormat[] = await getAllAddvertisements();
      setAnuncios(adds);
     
    };
    fetchAddvertisements();
    
  }, []);


  const [anuncios, setAnuncios] = useState<ImageFormat[]>([])
  const [guardando, setGuardando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSeleccionarImagen = () => {
    fileInputRef.current?.click()
  }

  const handleImagenSeleccionada = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setAnuncios([...anuncios, e.target.result])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const eliminarAnuncio = (URL: string) => {
    setAnuncios(anuncios.filter(({url}) => url !== URL))
    deleteAddversitesment(URL);
  }

  const handleAddAdvertisment = async ({url, height, width}: ImageFormat) => {
    setGuardando(true)
    // Simular guardado en base de datos
    await new Promise(resolve => setTimeout(resolve, 2000))
    setAnuncios(previous => [...previous, {url, height, width}])
    setGuardando(false)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Administrador de Anuncios</h1>
      <h2 className="text-xl font-bold mb-4">Estos anuncios se mostraran en la pagina principal</h2>
      <div className="mb-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleImagenSeleccionada}
          className="hidden"
          id="seleccionar-imagen"
          ref={fileInputRef}
        />
        <Button onClick={handleSeleccionarImagen}>
          <Upload className="mr-2 h-4 w-4" /> Seleccionar Imagen
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {anuncios.map(({url, height, width}, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Image src={url} alt={`Anuncio ${index + 1}`} width={width} height={height} className="w-full h-60 object-cover mb-2" />
              <Button variant="destructive" onClick={() => eliminarAnuncio(url)}>
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {anuncios.length === 0 && (
        <p className="text-center text-gray-500 mb-4">No hay anuncios seleccionados. Por favor, seleccione algunas imágenes.</p>
      )}
      <CldUploadWidget signatureEndpoint="/api/sign-cloudinary-params"
          options={{sources: ['local', 'url', 'google_drive', 'camera'], folder: "/anuncios", tags: []}}
          onSuccess={(results)=> {handleAddAdvertisment(results.info); console.log(results.info)}}
          >
            {({ open }) => {
            return (
              <Button 
                className='bg-cyan-400 rounded-lg px-20 py-5'
                disabled={guardando || anuncios.length === 0}
                onClick={() => open()}>
                <Save className="mr-2 h-4 w-4" />
                {guardando ? 'Guardando...' : 'Guardar Anuncios'}
              </Button>
            );
            }}
        </CldUploadWidget>
    </div>
  )
}