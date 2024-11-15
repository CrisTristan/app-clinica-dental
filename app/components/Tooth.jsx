import React, { useEffect, useReducer, useRef } from 'react';
import useContextMenu from 'contextmenu';
import 'contextmenu/ContextMenu.css';
import '../styles/Tooth.css';

function Tooth({ number, positionX, positionY, onChange, state }) {
    
    let initialState = {
            Cavities: {   //Caries
                center: 0,
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            },
            Extract: 0, //extraido
            Crown: 0,  //corona
            Ortodoncia: 0, 
            Fracture: 0
    };

    function reducer(toothState, action) {
        switch (action.type) {
            case 'crown':
                return { ...toothState, Crown: action.value };
            case 'extract':
                return { ...toothState, Extract: action.value };
            case 'Ortodoncia':
                return { ...toothState, Ortodoncia: action.value };
            case 'fracture':
                return { ...toothState, Fracture: action.value };
            case 'carie':
                return { ...toothState, Cavities: setCavities(toothState, action.zone, action.value) };
            case 'clear':
                return initialState;
            case 'set_data':
                return {...action.payload};
            default:
                console.log(toothState);
                throw new Error();
        }
    }

    // state = {
    //     Cavities: {   //Caries
    //         center: 1,
    //         top: 2,
    //         bottom: 1,
    //         left: 2,
    //         right: 1
    //     },
    //     Extract: 2, //extraido
    //     Crown: 0,  //corona
    //     Ortodoncia: 0, 
    //     Fracture: 0
    // }
    
    useEffect(()=>{
         if(state){
        //console.log(number, state)
        const isDifferent = JSON.stringify(state) !== JSON.stringify(toothState);
        if(isDifferent){
            dispatch({type: 'set_data', payload: state}) //evitar despachos innecesarios
        }  
        }
    }, [state])

    const crown = (val) => ({ type: "crown", value: val });
    const extract = (val) => ({ type: "extract", value: val });
    const Ortodoncia = (val) => ({ type: "Ortodoncia", value: val });
    const fracture = (val) => ({ type: "fracture", value: val });
    const carie = (z, val) => ({ type: "carie", value: val, zone: z });
    const clear = () => ({ type: "clear" });

    const [toothState, dispatch] = useReducer(reducer, state, (initialArg)=>{ return initialArg || initialState});

    const [contextMenu, useCM] = useContextMenu({ submenuSymbol: '>', positionX: 20, positionY: 20});


    const firstUpdate = useRef(true);
    

    useEffect(() => {
        if (firstUpdate.current) {
            firstUpdate.current = false;
            return;
        }
        onChange(number, toothState);
    }, [toothState]);

    // Done SubMenu
    const doneSubMenu = (place, value) => {
        return {
            'Cavity': () => {
                dispatch(carie(place, value));
            },
            'Cavities All': () => dispatch(carie('all', value)),
            'Absent': () => dispatch(extract(value)),
            'Crown': () => dispatch(crown(value)),
        }
    }

    // Todo SubMenu
    const todoSubMenu = (place, value) => {
        return {
            'Carie': () => dispatch(carie(place, value)),
            'Carie Todo': () => dispatch(carie('all', value)),
            'Ausente': () => dispatch(extract(value)),
            'Corona': () => dispatch(crown(value)),
            'Ortodoncia': () => dispatch(Ortodoncia(value)),
            'Fracturado': () => dispatch(fracture(value))
        }
    }

    // Main ContextMenu
    const menuConfig = state
    ? (place) => ({
        'Hecho': doneSubMenu(place, 1),
        'Tarea Pendiente': todoSubMenu(place, 2),
        'JSX line': <hr />,
        'Limpiar': () => dispatch(clear()),
    })
    : null;

    let getClassNamesByZone = (zone) => {
        if (toothState && toothState.Cavities) {
            if (toothState && toothState.Cavities[zone] === 1) {
                return 'to-do';
            } else if (toothState && toothState.Cavities[zone] === 2) {
                return 'done';
            }
        }

        return '';
    }

    // Tooth position
    const translate = `translate(${positionX},${positionY})`;

    return (
        <>
        { state && 
        (<svg className="tooth">
            <g transform={translate}>
                <polygon
                    points="0,0 20,0 15,5 5,5"
                    onClick={state ? useCM(menuConfig('top')) : undefined} //El context menu ahora se abre con click normal
                    // onContextMenu={useCM(menuConfig('top'))} 
                    className={getClassNamesByZone('top')}
                />
                <polygon
                    points="5,15 15,15 20,20 0,20"
                    onClick={useCM(menuConfig('bottom'))}
                    // onClick={state ? useCM(menuConfig('bottom')) : undefined}
                    className={getClassNamesByZone('bottom')}
                />
                <polygon
                    points="15,5 20,0 20,20 15,15"
                    onClick={state ? useCM(menuConfig('left')) : undefined}
                    className={getClassNamesByZone('left')}
                />
                <polygon
                    points="0,0 5,5 5,15 0,20"
                    onClick={state ? useCM(menuConfig('right')) : undefined}
                    className={getClassNamesByZone('right')}
                />
                <polygon
                    points="5,5 15,5 15,15 5,15"
                    onClick={state ? useCM(menuConfig('center')) : undefined}
                    className={getClassNamesByZone('center')}
                />
                {drawToothActions()}
                <text
                    x="6"
                    y="30"
                    stroke="navy"
                    fill="navy"
                    strokeWidth="0.1"
                    className="tooth">
                    {number}
                </text>
            </g>
            {contextMenu}
        </svg>)
        }
        </>
    )

    function setCavities(prevState, zone, value) {
        if (prevState && prevState.Cavities) {
            if (zone === "all") {
                prevState.Cavities =
                {
                    center: value,
                    top: value,
                    bottom: value,
                    left: value,
                    right: value
                }
            } else {
                prevState.Cavities[zone] = value;
            }

            return prevState.Cavities;
        }
    }

    function drawToothActions() {
        let otherFigures = null;
        if (toothState && toothState.Extract > 0) {
            otherFigures = <g stroke={toothState.Extract === 1 ? "red" : "blue"}>
                <line x1="0" y1="0" x2="20" y2="20" strokeWidth="2" />
                <line x1="0" y1="20" x2="20" y2="0" strokeWidth="2" />
            </g>
        }

        if (toothState && toothState.Fracture > 0) {
            otherFigures = <g stroke={toothState.Fracture === 1 ? "red" : "blue"}>
                <line x1="0" y1="10" x2="20" y2="10" strokeWidth="2"></line>
            </g>
        }
                        //Filter
        if (toothState && toothState.Ortodoncia > 0) {
            otherFigures = <g stroke={toothState.Fracture === 1 ? "red" : "blue"}>
                <line x1="0" y1="20" x2="0" y2="0" strokeWidth="2" />
                <line x1="0" y1="20" x2="20" y2="20" strokeWidth="2" />
                <line x1="20" y1="20" x2="20" y2="0" strokeWidth="2" />
                <line x1="0" y1="0" x2="20" y2="0" strokeWidth="2" />
                <line x1="5" y1="10" x2="15" y2="10" strokeWidth="2" />
                <line x1="10" y1="15" x2="10" y2="5" strokeWidth="2" />
            </g>
        }

        if (toothState && toothState.Crown > 0) {
            otherFigures = <circle
                cx="10"
                cy="10"
                r="10"
                fill="none"
                stroke={toothState.Crown === 1 ? "red" : "blue"}
                strokeWidth="2"
            />;
        }

        return otherFigures;
    }
}

export default Tooth;