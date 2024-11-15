export interface Appointment {
    id: string|number
    name: string
    description : string,
    phone: string,
    start: Date|string
    end: Date|string
}

export interface Patient {
    id: number,
    name: string,
    apellido_pat: string,
    apellido_mat: string,
    telefono: string,
    edad: number,
    email: string,
    lastVisit: string,
    nextAppointment: string,
    fechaNacimiento: string
    domicilio: string
    foto: string
    historialClinico: string[]
    presupuestos: { servicio: string; precio: number }[]
}

export interface ImageFormat{
    secure_url?: string,
    url: string | undefined,
    width: number,
    height: number
}

export interface Tooth {
    Cavities: {   //Caries
        center: number,
        top: number,
        bottom: number,
        left: number,
        right: number
    },
    Extract: number, //extraido
    Crown: number,  //corona
    Ortodoncia: number, 
    Fracture: number
}