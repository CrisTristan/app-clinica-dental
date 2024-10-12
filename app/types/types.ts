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
    ape_pat: string,
    ape_mat: string,
    telefono: string,
    email: string,
    lastVisit: string,
    nextAppointment: string,
    fechaNacimiento: string
    direccion: string
    foto: string
    historialClinico: string[]
    presupuestos: { servicio: string; precio: number }[]
}