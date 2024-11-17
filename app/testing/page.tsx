"use client"
import { useReducer } from "react"
import {
    Cloud,
    CreditCard,
    Github,
    Keyboard,
    LifeBuoy,
    LogOut,
    Mail,
    MessageSquare,
    Plus,
    PlusCircle,
    Settings,
    User,
    UserPlus,
    Users,
  } from "lucide-react"
   
  import { Button } from "@/components/ui/button"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"

export default function Testing(){

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

    const crown = (val) => ({ type: "crown", value: val });
    const extract = (val) => ({ type: "extract", value: val });
    const Ortodoncia = (val) => ({ type: "Ortodoncia", value: val });
    const fracture = (val) => ({ type: "fracture", value: val });
    const carie = (z, val) => ({ type: "carie", value: val, zone: z });
    const clear = () => ({ type: "clear" });

    const [toothState, dispatch] = useReducer(reducer, initialState)

    const handleMenuClick = ()=>{
        console.log(toothState);
    }

    return(
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Open</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Estado del diente</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={()=>dispatch(carie('top', 2))}>
              <span>Carie</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={()=>dispatch(extract(2))}>
              <Plus />
              <span>Extraido</span>
              <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={()=>dispatch(crown(2))}>
              <Plus />
              <span>Corona</span>
              <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={()=>dispatch(Ortodoncia(2))}>
              <Plus />
              <span>Ortodoncia</span>
              <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={()=>dispatch(fracture(2))}>
              <Plus />
              <span>Fracturado</span>
              <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={()=>handleMenuClick()}>
            <LogOut />
            <span>Log out</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}