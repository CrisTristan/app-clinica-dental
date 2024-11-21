import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

export default function Alergias({ id }: { id: string | null }) {

    const [text, setText] = useState('');

    useEffect(()=>{
        const fetchData = async ()=>{
          if (id) {
            try {
                const response = await fetch(`/DentalData/api?id=${id}`);
                if (!response.ok) {
                    throw new Error('Error en la solicitud');
                }
                const data = await response.json();
                //console.log(data);
                // console.log(data.blandos)
                setText(data.alergias)
            } catch (error) {
                console.log(error);
            }
        }
        }
        
        fetchData();
      },[]);
      
    const handleBlur = () => {

        fetch('/DentalData/api', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              // Datos que enviarás en el cuerpo de la solicitud
              alergias: text,
              id: id
            })
          })
          .then(response => {
            if (!response.ok) {
              throw new Error('Error en la solicitud');
            }
            return response.json();
          }).catch(error => {
            console.log(error);
          })
    }

    const handleTextChange = (e) => {
        //console.log(e.target.value)
        setText(e.target.value)
    }

    return (
        <div>
            <h1>Alergias</h1>
            <Textarea
                value={text}
                onChange={(e) => handleTextChange(e)} 
                onBlur={() => handleBlur()} />
        </div>
    )
}