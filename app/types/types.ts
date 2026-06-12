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
    sexo: string,
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

export interface Service {
    id: number;
    name: string;
    price: number;
}

export interface PatientService {
    name: string;
    activeService: string;
    totalCost: number;
    balance: number;
}

export interface PatientServiceRow {
  id: string
  patient_id: number
  patient_name: string
  patient_phone?: string
  name: string
  price: number
  balance: number
  created_at: string
}

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia'

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
}

export interface PaymentHistoryRow {
  id: number
  patient_service_id: string
  abono: number
  fecha: string
  metodo_pago?: MetodoPago
  registrado_por?: string | null
  registrado_por_nombre?: string | null
}