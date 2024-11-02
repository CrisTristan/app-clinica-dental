import React, { useEffect, useState } from 'react';
import Tooth from './Tooth';

function Teeth({ start, end, x, y, handleChange, id }) {
    let tooths = getArray(start, end);

    const [teethState, setTeethState] = useState(null);
    const [teethStateKeys, setTeethStateKeys] = useState([]);

    useEffect(() => {
        const fetchTeethState = async () => {
            if (id) {
                try {
                    const response = await fetch(`http://localhost:3000/tooth/api?id=${id}`);
                    if (!response.ok) {
                        throw new Error('Error en la solicitud');
                    }
                    const data = await response.json();
                    setTeethState(data.teethState);  // Guardar el estado de los dientes
                    //setTeethStateKeys(Object.keys(data.teethState));  // Guardar las claves si es necesario
                } catch (error) {
                    console.log(error);
                }
            }
            console.log(teethState);
        };
        
        fetchTeethState();
    }, [id]);

    console.log(teethState);

    return (
        <g transform="scale(1.4)" id="gmain">
            {
                tooths.map((i) =>
                {
                    if(teethState){
                    <Tooth onChange={handleChange}
                        key={i}
                        number={i}
                        state={teethState[i]}
                        positionY={y}
                        positionX={Math.abs((i - start) * 25) + x}
                    />
                    }
                }
                )
            }
        </g>
    )
}

function getArray(start, end) {
    if (start > end) return getInverseArray(start, end);

    let list = [];
    for (var i = start; i <= end; i++) {
        list.push(i);
    }

    return list;
}

function getInverseArray(start, end) {
    let list = [];

    for (var i = start; i >= end; i--) {
        list.push(i);
    }

    return list;
}

export default Teeth;