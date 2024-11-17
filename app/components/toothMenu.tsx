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
import { Plus, LogOut } from 'lucide-react';
import { ReactElement } from "react";

export default function ToothMenu({ children, location, dispatch, carie, extract, crown, fracture, ortodoncia }:
    {
        child: ReactElement,
        location: number, 
        dispatch: () => void, 
        carie: (z:string, val: number) => ({ type: string, value: number, zone: string }),
        extract: (val) => ({ type: string, value: number }),
        crown: (val) => ({ type: string, value: number }),
        fracture: (val) => ({ type: string, value: number }),
        ortodoncia: (val) => ({ type: string, value: number }),
    }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {
                    children
                }
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Estado del diente</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => dispatch(carie(location, 1))}>
                        <span>Carie</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => dispatch(extract(1))}>
                        <Plus />
                        <span>Extraido</span>
                        <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => dispatch(crown(1))}>
                        <Plus />
                        <span>Corona</span>
                        <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => dispatch(ortodoncia(1))}>
                        <Plus />
                        <span>Ortodoncia</span>
                        <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => dispatch(fracture(1))}>
                        <Plus />
                        <span>Fracturado</span>
                        <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}