'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { savePatientBudgets } from '../actions/saveBudgets'
import { getPatientBudgets } from '../actions/getPatientBudgets'
import { getServices } from '../actions/getServices'
import { useToast } from "@/hooks/use-toast"
import DeleteButtonNotify from './deleteButtonNotify'
import { Service } from '../types/types'

type payment = {
  abono: number,
  fecha: Date,
}

type Budget = {
  id: string
  name: string
  price: number
  balance: number
  createdAt: Date
  paymentHistory: payment[]
}

export default function ManageBudgets({ id }) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [catalogServices, setCatalogServices] = useState<Service[]>([])
  const [showServices, setShowServices] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [newService, setNewService] = useState({ name: '', price: 0 })
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const { toast } = useToast()

  // Evita que la carga inicial (o la recarga desde el servidor) dispare un guardado innecesario
  const skipNextSave = useRef(true)

  useEffect(() => {
    const fetchPatientBudgets = async () => {
      const savedBudgets = await getPatientBudgets(id);
      if (savedBudgets?.servicios) {
        skipNextSave.current = true
        setBudgets(savedBudgets.servicios.map((budget: Budget) => ({
          ...budget,
          createdAt: new Date(budget.createdAt)
        })))
      } else {
        skipNextSave.current = false
      }
    }

    fetchPatientBudgets();
  }, [id])

  useEffect(() => {
    const fetchCatalogServices = async () => {
      const data = await getServices()
      if (data) setCatalogServices(data)
    }

    fetchCatalogServices();
  }, [])

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveBudgetsToDatabase(budgets)
  }, [budgets])

  const saveBudgetsToDatabase = async (budgetsToSave: Budget[]) => {
    const savedBudgets = await savePatientBudgets(id, budgetsToSave);
    if (!savedBudgets) {
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los servicios del paciente. Intenta de nuevo.",
      })
    }
  }

  const sumAllPayments = (budget: Budget) => {
    let suma: number = 0;
    budget.paymentHistory.forEach(element => {

      suma += Number(element.abono);
    });

    return suma;
  }

  const createBudget = (serviceName: string, price?: number) => {
    const numericPrice = Number(price)
    if (!serviceName || !numericPrice || numericPrice <= 0) {
      toast({
        title: "Datos inválidos",
        description: "Ingresa un nombre y un precio válido para el servicio.",
      })
      return
    }

    const newBudget: Budget = {
      id: Date.now().toString(),
      name: serviceName,
      price: numericPrice,
      balance: numericPrice,
      createdAt: new Date(),
      paymentHistory: []
    }
    setBudgets([...budgets, newBudget])
    setShowServices(false)
  }

  const startEditBudget = (budget: Budget) => {
    setEditName(budget.name)
    setEditPrice(budget.price.toString())
  }

  const saveEditBudget = (id: string) => {
    const numericPrice = Number(editPrice)
    if (!editName || !numericPrice || numericPrice <= 0) {
      toast({
        title: "Datos inválidos",
        description: "Ingresa un nombre y un precio válido para el servicio.",
      })
      return
    }

    setBudgets(budgets.map(budget => {
      if (budget.id !== id) return budget
      const paid = sumAllPayments(budget)
      return {
        ...budget,
        name: editName,
        price: numericPrice,
        balance: Math.max(0, numericPrice - paid)
      }
    }))
  }

  const deleteBudget = (id: string) => {
    setBudgets(budgets.filter(budget => budget.id !== id))
    setSelectedBudget(null)
  }

  const makePayment = (id: string) => {
    const amount = parseFloat(paymentAmount)
    const paymentDate = new Date()
    if (isNaN(amount) || amount <= 0) return

    setBudgets(budgets.map(budget => {
      if (budget.id !== id) return budget
      const appliedAmount = Math.min(amount, budget.balance)
      return {
        ...budget,
        balance: budget.balance - appliedAmount,
        paymentHistory: [...budget.paymentHistory, { abono: appliedAmount, fecha: paymentDate }]
      }
    }))
    setPaymentAmount('')
    setSelectedBudget(null)
  }

  const onNewServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService((prev) => ({
      ...prev,
      [name]: value
    }))
  }
  const handleNewService = () => {
    createBudget(newService.name, newService.price);
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gestión de Presupuestos</h1>
      <div className='flex justify-between'>
        <Dialog open={showServices} onOpenChange={setShowServices}>
          <DialogTrigger asChild>
            <Button>Seleccionar Servicio</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Servicio</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] p-4">
              {catalogServices.map(service => (
                <Dialog key={service.id}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setNewService({ name: service.name, price: service.price })}
                      className="w-full mb-2"
                      variant="outline"
                    >
                      {service.name}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                          <DialogTitle>Costo de {service.name}</DialogTitle>
                          <DialogDescription>Confirma o ajusta el costo del servicio seleccionado</DialogDescription>
                    </DialogHeader>
                    <Input value={newService.name} type='text' name='name' placeholder='servicio' disabled={true}/>
                    <Input value={newService.price} type='number' name='price' placeholder='seleccionar el precio' onChange={(e) => onNewServiceChange(e)}></Input>
                    <Button onClick={() => handleNewService()}>Confirmar</Button>
                  </DialogContent>
                </Dialog>
              ))}
              {catalogServices.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                  El catálogo de servicios está vacío. Agrégalos desde la sección "Catálogo".
                </p>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Nuevo Servicio</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Servicio Personalizado</DialogTitle>
              <DialogDescription>Ingresa el nombre y costo del nuevo servicio</DialogDescription>
            </DialogHeader>
            <Input value={newService.name} type='text' name='name' placeholder='servicio' onChange={(e) => onNewServiceChange(e)}></Input>
            <Input value={newService.price} type='number' name='price' placeholder='precioServicio' onChange={(e) => onNewServiceChange(e)}></Input>
            <Button onClick={() => handleNewService()}>Confirmar</Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <h1>Presupuestos Activos</h1>
        {budgets.map(budget => (
          <Card key={budget.id}>
            <CardHeader>
              <CardTitle>{budget.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Total: ${budget.price}</p>
              <p>Por Pagar: ${budget.balance.toFixed(2)}</p>
              <p>Pagado: ${sumAllPayments(budget)}</p>
              <p>Creado: {budget.createdAt.toLocaleDateString()}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Abonar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Abonar a {budget.name}</DialogTitle>
                  </DialogHeader>
                  <Input
                    type="number"
                    placeholder="Cantidad a abonar"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Button onClick={() => makePayment(budget.id)}>Confirmar Abono</Button>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => startEditBudget(budget)}>Editar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar {budget.name}</DialogTitle>
                    <DialogDescription>Modifica el nombre o el precio sin perder el historial de pagos</DialogDescription>
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
                  <Button onClick={() => saveEditBudget(budget.id)}>Guardar cambios</Button>
                </DialogContent>
              </Dialog>
              <DeleteButtonNotify
                onDelete={() => deleteBudget(budget.id)}
                itemName={`el servicio "${budget.name}" y su historial de pagos`}
                text="Eliminar"
                size="default"
              />

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Historial Abonos</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Historial de {budget.name}</DialogTitle>
                  </DialogHeader>
                  {budget.paymentHistory.map((payment: payment, index) => (
                    <div key={index} className='flex'>
                      <p>{payment.fecha ? `${new Date(payment?.fecha).getFullYear()}-${new Date(payment?.fecha).getMonth() + 1}-${new Date(payment?.fecha).getDate()}` : ""}</p>
                      <p>{payment.abono ? "$" + payment.abono : " "}</p>
                    </div>
                  ))}
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}