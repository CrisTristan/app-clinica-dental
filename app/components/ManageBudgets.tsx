'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { savePatientBudgets } from '../actions/saveBudgets'
import { getPatientBudgets } from '../actions/getPatientBudgets'

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

const dentalServices = [
  "Limpieza dental",
  "Extracción",
  "Empaste",
  "Blanqueamiento",
  "Ortodoncia",
  "Implante dental",
  "Endodoncia",
  "Prótesis dental",
  "Revisión general",
  "Radiografía dental"
]

export default function ManageBudgets({id}) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [showServices, setShowServices] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [newService, setNewService] = useState({name: '', price: 0})

  useEffect(() => {
    // Cargar presupuestos guardados al iniciar
    //const savedBudgets = localStorage.getItem('dentalBudgets')
    const fetchPatientBudgets = async ()=> {
       const savedBudgets = await getPatientBudgets(id);
       console.log(savedBudgets);
       if (savedBudgets?.servicios) {
        setBudgets(savedBudgets.servicios.map((budget: Budget) => ({
          ...budget,
          createdAt: new Date(budget.createdAt)
        })))
      }

    }

    fetchPatientBudgets();

    
  }, [])

  const firstUpdate = useRef(true);
  
  useEffect(() => {
    // Guardar presupuestos cada vez que cambian
    //console.log(budgets);
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }
    saveBudgetsToDatabase(budgets)
  }, [budgets])

  const saveBudgetsToDatabase = async (budgetsToSave: Budget[]) => {
    // Simular guardado en base de datos usando localStorage
    //localStorage.setItem('dentalBudgets', JSON.stringify(budgetsToSave))
    //if(budgetsToSave.length === 0) return;
    const savedBudgets = await savePatientBudgets(id, budgetsToSave);
    //console.log(savedBudgets);
  }

  const sumAllPayments = (budget : Budget)=>{
      let suma: number=0;
      budget.paymentHistory.forEach(element => {
        
        suma += Number(element.abono);
      });

      return suma;
  }

  const createBudget = (serviceName: string, price?: number) => {
    const newBudget: Budget = {
      id: Date.now().toString(),
      name: serviceName,
      price: Number(price) || 1000,
      balance: Number(price) || 1000, // Ejemplo de saldo inicial
      createdAt: new Date(),
      paymentHistory: [{abono: '', fecha: ''}]
    }
    setBudgets([...budgets, newBudget])
    setShowServices(false)
  }

  const deleteBudget = (id: string) => {
    setBudgets(budgets.filter(budget => budget.id !== id))
    setSelectedBudget(null)
  }

  const makePayment = (id: string) => {
    const amount = parseFloat(paymentAmount)
    const paymetDate = new Date()
    if (isNaN(amount) || amount <= 0) return

    setBudgets(budgets.map(budget =>                                            //revisar
      budget.id === id 
        ? { ...budget, balance: Math.max(0, budget.balance - amount), paymentHistory: [...budget.paymentHistory, {abono: amount, fecha: paymetDate}] }
        : budget
    ))
    setPaymentAmount('')
    setSelectedBudget(null)
  }

  const onNewServiceChange = (e)=>{
    const {name, value} = e.target;
    setNewService((prev)=>({
        ...prev,
        [name]: value
    }))
  }
  const handleNewService = ()=>{
    console.log(newService);
    createBudget(newService.name, newService.price);
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gestión de Presupuestos</h1>
      <div className='flex justify-between'>
      <Dialog open={showServices}>
        <DialogTrigger asChild>
          <Button onClick={() => setShowServices(true)}>Seleccionar Servicio</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Servicio</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] p-4">
            {dentalServices.map(service => (
              <Button 
                key={service} 
                onClick={() => createBudget(service)}
                className="w-full mb-2"
                variant="outline"
              >
                {service}
              </Button>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <Dialog>
        <DialogTrigger>
            <Button>Nuevo Servicio</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>Nombre Servicio</DialogHeader>
            <Input  value={newService.name} type='text' name='name' placeholder='servicio' onChange={(e)=> onNewServiceChange(e)}></Input>
            <Input value={newService.price} type='number' name='price' placeholder='precioServicio' onChange={(e)=> onNewServiceChange(e)}></Input>
            <Button onClick={ ()=>handleNewService()}>Confirmar</Button>
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
              <Button variant="destructive" onClick={() => deleteBudget(budget.id)}>Eliminar</Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Historial Abonos</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Historial de {budget.name}</DialogTitle>
                  </DialogHeader>
                   {budget.paymentHistory.map((payment: payment, index)=>(
                    <div key={index} className='flex'>
                    <p>{ payment.fecha ? `${new Date(payment?.fecha).getFullYear()}-${new Date(payment?.fecha).getMonth()}-${new Date(payment?.fecha).getDate()}`: ""}</p>
                    <p>{ payment.abono ? "$"+payment.abono: " "}</p>
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