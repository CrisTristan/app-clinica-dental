import React, {useContext, useEffect, useState, useRef}from 'react';
import Teeth from './Teeth';
import "../styles/Odontogram.css"
import { useSearchParams } from 'next/navigation';
import Tooth from './Tooth';

export default function Odontogram() {

  const searchParams = useSearchParams()
  const name = searchParams.get('name');
  const id =searchParams.get('id');
  const [teethState, setTeethState] = useState({});

  const [teethStateKeys, setTeethStateKeys ] = useState([])
    useEffect(() => {
      const fetchTeethState = async () => {
          if (id) {
              try {
                  const response = await fetch(`http://localhost:3000/tooth/api?id=${id}`);
                  if (!response.ok) {
                      throw new Error('Error en la solicitud');
                  }
                  const data = await response.json();
                  //console.log(data.teethState);
                  setTeethState(data.teethState);
                  //setFirstTeethState(data.teethState);  // Guardar el estado de los dientes
                  setTeethStateKeys(Object.keys(data.teethState));  // Guardar las claves si es necesario
              } catch (error) {
                  console.log(error);
              }
          }
          //console.log(teethState);
      };
      
      fetchTeethState();
  }, [id]);

  // const firstUpdate = useRef(true);

  // useEffect(() => {
  //   console.log(teethState); // Aquí verás el estado actualizado
  //   if (firstUpdate.current) {
  //           firstUpdate.current = false;
  //           return;
  //   }
    
  //   const isEmpty = (obj) => Object.keys(obj).length === 0;

  //   if(!isEmpty(teethState)){
  //     handleSaveTeeth();
  //   }
  // }, [teethState]);

  // const handleToothUpdate = (id, toothState) => {
  //   odontogramState[id] = toothState;
  //   console.log("Estado del diente", toothState)
  // };

  // Aquí almacenamos el estado de todos los dientes
  

  // Esta función se ejecutará cuando cambie el estado de un diente específico
  const handleToothUpdate = (toothNumber, newToothState) => {
    setTeethState(prevState => ({
      ...prevState,
      [toothNumber]: newToothState
    }));
  };

  const handleSaveTeeth = () => {
    //console.log('Estado de los dientes:', teethState);
    fetch('http://localhost:3000/tooth/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Datos que enviarás en el cuerpo de la solicitud
        teethState: teethState,
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
  };
 
  return (
    <div className="Odontogram">
    <div className="h-80"> {/* Permite scroll horizontal si es necesario */}
      <svg 
        version="1.1" 
        className="" // Añade clases de Tailwind
        viewBox="" // Ajusta el tamaño del viewport
        height="100%"
        width="100%"
      >
        <Teeth start={18} end={11} x={60} y={0} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={21} end={28} x={60} y={40} handleChange={handleToothUpdate} teethState={teethState}/>

        <Teeth start={55} end={51} x={30} y={80} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={61} end={65} x={160} y={80} handleChange={handleToothUpdate} teethState={teethState}/>

        <Teeth start={85} end={81} x={30} y={120} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={71} end={75} x={160} y={120} handleChange={handleToothUpdate} teethState={teethState}/>

        <Teeth start={48} end={41} x={60} y={160} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={31} end={38} x={60} y={200} handleChange={handleToothUpdate} teethState={teethState}/>
      </svg>
      <button onClick={()=>handleSaveTeeth()} className='bg-cyan-300 p-4'>Guardar Dientes</button>
    </div>
  </div>
  );
}
