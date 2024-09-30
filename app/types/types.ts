export interface Appointment {
    id: string|number
    name: string
    description : string,
    start: Date|string
    end: Date|string
}

export interface Patient {
    id: number,
    name: string,
    phone: number,
    email: string,
    lastVisit: string,
    nextAppointment: string
}