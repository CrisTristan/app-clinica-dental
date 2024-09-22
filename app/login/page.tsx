"use client"

import NavBar from '../components/navBar';
import { useState } from 'react'
import {Button, ButtonGroup} from "@nextui-org/button";
import { Input } from "@nextui-org/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


export default function Login(){
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
  
    const handleSubmit = (event: React.FormEvent) => {
      event.preventDefault()
      // Aquí iría la lógica para manejar el inicio de sesión
      console.log('Inicio de sesión con:', { username, password })
    }
  
    return (
    <main>

      <NavBar/>
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingrese su nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Iniciar Sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
    )
}