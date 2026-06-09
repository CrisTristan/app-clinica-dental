'use client'

import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getServices } from '../actions/getServices'
import { createService } from '../actions/createService'
import { updateService } from '../actions/updateService'
import { deleteService } from '../actions/deleteService'
import { Service } from '../types/types'
import DeleteButtonNotify from './deleteButtonNotify'

export default function CatalogoServicios() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [newService, setNewService] = useState({ name: '', price: '' })
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    const fetchServices = async () => {
      const data = await getServices()
      if (data) setServices(data)
      setLoading(false)
    }
    fetchServices()
  }, [])

  const handleCreate = async () => {
    const numericPrice = Number(newService.price)
    if (!newService.name.trim() || !numericPrice || numericPrice <= 0) {
      toast({
        title: "Datos inválidos",
        description: "Ingresa un nombre y un precio válido para el servicio.",
      })
      return
    }

    const created = await createService(newService.name.trim(), numericPrice)
    if (!created) {
      toast({
        title: "Error al guardar",
        description: "No se pudo agregar el servicio al catálogo. Intenta de nuevo.",
      })
      return
    }

    setServices(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setNewService({ name: '', price: '' })
  }

  const startEdit = (service: Service) => {
    setEditName(service.name)
    setEditPrice(service.price.toString())
  }

  const handleEdit = async (id: number) => {
    const numericPrice = Number(editPrice)
    if (!editName.trim() || !numericPrice || numericPrice <= 0) {
      toast({
        title: "Datos inválidos",
        description: "Ingresa un nombre y un precio válido para el servicio.",
      })
      return
    }

    const updated = await updateService(id, editName.trim(), numericPrice)
    if (!updated) {
      toast({
        title: "Error al guardar",
        description: "No se pudo actualizar el servicio. Intenta de nuevo.",
      })
      return
    }

    setServices(prev => prev.map(service => service.id === id ? updated : service).sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleDelete = async (id: number) => {
    const deleted = await deleteService(id)
    if (!deleted) {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el servicio. Intenta de nuevo.",
      })
      return
    }

    setServices(prev => prev.filter(service => service.id !== id))
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Catálogo de Servicios</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
        Estos servicios y sus precios estarán disponibles al crear presupuestos para los pacientes.
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button>Agregar Servicio</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Servicio</DialogTitle>
            <DialogDescription>Ingresa el nombre y el precio del servicio que se agregará al catálogo</DialogDescription>
          </DialogHeader>
          <Input
            value={newService.name}
            type="text"
            placeholder="Nombre del servicio"
            onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            value={newService.price}
            type="number"
            placeholder="Precio del servicio"
            onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
          />
          <Button onClick={handleCreate}>Agregar al catálogo</Button>
        </DialogContent>
      </Dialog>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map(service => (
          <Card key={service.id}>
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Precio: ${service.price}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => startEdit(service)}>Editar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar {service.name}</DialogTitle>
                    <DialogDescription>Modifica el nombre o el precio del servicio</DialogDescription>
                  </DialogHeader>
                  <Input
                    value={editName}
                    type="text"
                    placeholder="Nombre del servicio"
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <Input
                    value={editPrice}
                    type="number"
                    placeholder="Precio del servicio"
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                  <Button onClick={() => handleEdit(service.id)}>Guardar cambios</Button>
                </DialogContent>
              </Dialog>
              <DeleteButtonNotify
                onDelete={() => handleDelete(service.id)}
                itemName={`el servicio "${service.name}" del catálogo`}
                text="Eliminar"
                size="default"
              />
            </CardFooter>
          </Card>
        ))}
      </div>

      {!loading && services.length === 0 && (
        <p className="text-center text-gray-500 dark:text-slate-400 mt-6">
          No hay servicios en el catálogo todavía. Agrega el primero con el botón de arriba.
        </p>
      )}
    </div>
  )
}
