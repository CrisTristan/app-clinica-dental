'use client'

import { Dispatch, SetStateAction, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteButtonProps {
  onDelete: () => Promise<string> | void;
  itemName?: string;
  nextAction?: Dispatch<SetStateAction<string | null>>,
  text?: string
  size?: string
}

export default function DeleteButtonNotify({ onDelete, itemName = 'este elemento', nextAction , text, size}: DeleteButtonProps) {
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    onDelete()
    if(nextAction) nextAction(null)
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size={size ? size : 'icon'}>
          <Trash2 className="h-4 w-4" />
          {text}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente {itemName}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}