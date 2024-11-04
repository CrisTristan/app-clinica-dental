import React, {useContext, useEffect, useState}from 'react';
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
                  console.log(data.teethState);
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

  useEffect(() => {
    //console.log(teethState); // Aquí verás el estado actualizado
}, [teethState]);

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

  const handleSave = () => {
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
 
  const i=16;
  return (
    <div className="Odontogram">
    <div className="overflow-x-auto"> {/* Permite scroll horizontal si es necesario */}
      <svg 
        version="1.1" 
        className="" // Añade clases de Tailwind
        viewBox="" // Ajusta el tamaño del viewport
        height="100%"
        width="100%"
      >
        <Teeth start={18} end={11} x={0} y={0} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={21} end={28} x={210} y={0} handleChange={handleToothUpdate} teethState={teethState}/>

        <Teeth start={55} end={51} x={75} y={40} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={61} end={65} x={210} y={40} handleChange={handleToothUpdate} teethState={teethState}/>

        <Teeth start={85} end={81} x={75} y={80} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={71} end={75} x={210} y={80} handleChange={handleToothUpdate} teethState={teethState}/>

        <Teeth start={48} end={41} x={0} y={120} handleChange={handleToothUpdate} teethState={teethState}/>
        <Teeth start={31} end={38} x={210} y={120} handleChange={handleToothUpdate} teethState={teethState}/>
        {/* {
            <Tooth onChange={handleToothUpdate}
            key={i}
            number={i}
            positionY={0}
            positionX={Math.abs((i - 18) * 25) + 0}
            state={teethState[i]}
            />
        } */}
      </svg>
      <button 
        onClick={handleSave} 
        className="mt-4 w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded"
      >
        Guardar Estado
      </button>
    </div>
  </div>
  );
}
