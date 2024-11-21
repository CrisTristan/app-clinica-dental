'use client'

import { useEffect, useState } from 'react'
import { format, parseISO, startOfWeek, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MessageCircleMore, SendIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from "@/components/ui/textarea"
import { useToast } from '@/hooks/use-toast'

type Cita = {
  id: string
  desc: string
  startDate: string
  endDate: string
  nameId: number
  name: {
    id: number
    name: string
    apellido_pat: string
    apellido_mat: string
    telefono: string
    edad: number | null
    domicilio: string | null
    sexo: string | null
  }
}

export default function CitasDentales({ citas = [] }: { citas?: Cita[] }) {

  const { toast } = useToast();

  useEffect(() => {
    if (citas) {
      console.log(citas)
    }
  }, [])

  const handleChangeMessage = (e)=>{
    const value = e.target.value;
    setMessage(value)
  }

  const [messageStatus, setMessageStatus] = useState('');

  const sendMessage = async (number: string)=>{
    if(message.length === 0) return;

    console.log(number, message)
    await fetch('/api/sendMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
         number: '9983787078',
         message: message
      })
    }).then(async response => {
      const data = await response.text();
      console.log(data);
      const JSONObject= JSON.parse(data);
      console.log(JSONObject.response);
      // toast({
      //   title: 'Mensaje Enviado',
      //   description: JSONObject.response,
      // })
      return data.response;
    }).catch(error => {
      console.log(error);
    })
  }


  const [currentDay, setCurrentDay] = useState(new Date())
  const [message, setMessage] = useState('');

  const citasDelDia = citas.filter(cita => {
    const citaDate = parseISO(cita.startDate)
    return citaDate.getDate() === currentDay.getDate() &&
      citaDate.getMonth() === currentDay.getMonth() &&
      citaDate.getFullYear() === currentDay.getFullYear()
  })

  const goToPreviousDay = () => setCurrentDay(prevDay => subDays(prevDay, 1))
  const goToNextDay = () => setCurrentDay(prevDay => addDays(prevDay, 1))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={goToPreviousDay} variant="outline" size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold text-center">
          {format(currentDay, 'EEEE d MMMM', { locale: es })}
        </h2>
        <Button onClick={goToNextDay} variant="outline" size="icon">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Card className="w-full sm:w-full">
        <CardHeader>
          <CardTitle className="text-center">
            Citas del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          {citasDelDia.length === 0 ? (
            <p className="text-center text-muted-foreground">No hay citas para este día</p>
          ) : (
            <ul className="space-y-2">
              {citasDelDia.map(cita => (
                <li key={cita.id} className="flex justify-between space-x-2 p-2 rounded-md bg-teal-300 text-lg">
                  <div className='flex flex-col jutify-center'>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{cita.name?.name[0]}{}</AvatarFallback>
                    </Avatar>
                    {/* <div className="flex-grow"> */}
                    <p className="text-lg text-muted-foreground">
                      {format(parseISO(cita.startDate), 'HH:mm')} - {format(parseISO(cita.endDate), 'HH:mm')}
                    </p>
                  </div>
                  <p className="font-semibold">{cita.name.name} {cita.name.apellido_pat}</p>
                  <p>{cita.name.telefono}</p>
                  <div className='flex flex-col justify-between md:flex-row:justify-around'>
                  <p>{cita.desc}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <MessageCircleMore/>
                        Enviar mensaje
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{`Enviar un Whatsapp a ${cita.name.name}`}</DialogTitle>
                      </DialogHeader>
                      <Textarea name="message" value={message} placeholder='ingrese el mensaje a enviar' onChange={(e)=> handleChangeMessage(e)}/>
                      <Button onClick={()=>{
                        sendMessage(cita.name.telefono);
                        toast({
                            title: 'Mensaje Enviado',
                            description: messageStatus,
                        })
                        }}>Enviar</Button>
                    </DialogContent>
                  </Dialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}