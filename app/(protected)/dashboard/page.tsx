"use client"

import { SignOut } from "@/app/components/signOut"
import { auth } from "@/auth"
import React, { useEffect, useState } from "react";
import { FaSearch, FaFilter, FaUserAlt, FaClock, FaChartBar, FaSpinner, FaDollarSign, FaFileInvoiceDollar, FaUsers } from "react-icons/fa";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { format, parseISO, startOfWeek, addDays, subDays } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  // const session = await auth()

  // if (!session) {
  //   return <div>Not authenticated</div>
  // }
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pendingCollectionMoney, setPendingCollectionMoney] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [IncomingPerMonth, setIncomingPerMonth] = useState([0,0,0,0,0,0,0,0,0,0,0,0])
  const router = useRouter();

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        //console.log(formattedDate);
        const data = await fetch(`/appointments/api?startDate=${formattedDate}`);
        const appointments = await data.json();
        console.log("citas", appointments)
        setAppointments(appointments)
      } catch (error) {
        console.log(error)
      }
    }

    if (appointments) {
      // console.log(appointments);
    }
    fetchAppointments()
  }, [])

  useEffect(() => {
    const getAllPatients = () => {
      const response = fetch('/patients/api')
      response.then(data => {
        return data.json()
      })
        .then(patients => {
          console.log(patients)
          setPatients(patients)
        })
        .catch(error => {
          console.log(error)
        })
    }

    getAllPatients()
  }, []);

  useEffect(() => {

    let pendingCollection = 0;
    let monthIncome = 0;
    let monthIncomes = 0;

    patients.map((patient) => {
      //console.log("servicios ", patient.servicios);
      if (patient.servicios.length > 0) {
        patient.servicios.map((service) => {
          pendingCollection += service.balance;
          console.log("Cobros Pendientes", pendingCollection);
          // monthIncome+=service.price - service.balance;
          if (service.paymentHistory.length > 1) {
            service.paymentHistory.map((payment) => {
              const currentDate = new Date().getMonth() + 1;
              const monthPayment = new Date(payment.fecha).getMonth() + 1;
              //console.log("abono del mes", payment.abono);
              updatePosition(Number(monthPayment-1),Number(payment.abono))
              if (monthPayment === currentDate) {
                monthIncome += payment.abono;
                //console.log("abono", monthIncome);
              }
            })
          }

        })
      }
    })

    setPendingCollectionMoney(pendingCollection);
    setMonthIncome(monthIncome)
    // if(IncomingPerMonth){
    //   console.log("incoming per month", IncomingPerMonth);
    // }
  }, [patients]);

  useEffect(()=>{
    console.log("incoming per month", IncomingPerMonth);
  }, [IncomingPerMonth])

  const updatePosition = (index: number, value : number) => {
    console.log("index", index, "value", value);
    if(isNaN(index)){
      return;
    }
    setIncomingPerMonth((prev) => {
      const updatedArray = [...prev]; // Crea una copia del arreglo original
      updatedArray[index] += value; // Actualiza el valor en la posición específica
      return updatedArray; // Retorna el nuevo arreglo
    });
  };

  const filteredPatients = patients?.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.telefono.includes(searchTerm) /*||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())*/
  )


  // const dummyAppointments = [
  //   {
  //     id: 1,
  //     patientName: "John Doe",
  //     date: "2024-02-15",
  //     time: "10:00 AM",
  //     status: "confirmed",
  //     notes: "Regular checkup",
  //   },
  //   {
  //     id: 2,
  //     patientName: "Jane Smith",
  //     date: "2024-02-15",
  //     time: "11:30 AM",
  //     status: "pending",
  //     notes: "Tooth extraction",
  //   },
  //   {
  //     id: 3,
  //     patientName: "Mike Johnson",
  //     date: "2024-02-16",
  //     time: "2:00 PM",
  //     status: "completed",
  //     notes: "Root canal",
  //   },
  // ];

  // const dummyPatients = [
  //   {
  //     id: 1,
  //     name: "John Doe",
  //     contact: "+1234567890",
  //     lastVisit: "2024-01-15",
  //     upcomingAppointment: "2024-02-15",
  //     avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d"
  //   },
  //   {
  //     id: 2,
  //     name: "Jane Smith",
  //     contact: "+1987654321",
  //     lastVisit: "2024-01-20",
  //     upcomingAppointment: "2024-02-15",
  //     avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
  //   },
  //   {
  //     id: 3,
  //     name: "Mike Johnson",
  //     contact: "+1122334455",
  //     lastVisit: "2024-01-25",
  //     upcomingAppointment: "2024-02-16",
  //     avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde"
  //   },
  // ];

  // const chartData = {
  //   labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  //   datasets: [
  //     {
  //       label: "Patient Visits",
  //       data: [65, 59, 80, 81, 56, 55],
  //       fill: false,
  //       borderColor: "rgb(75, 192, 192)",
  //       tension: 0.1,
  //     },
  //   ],
  // };

  const incomeChartData = {
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    datasets: [
      {
        label: "Monthly Income",
        data: IncomingPerMonth,
        fill: false,
        borderColor: "rgb(255, 99, 132)",
        tension: 0.1,
      },
    ],
  };

  // const pieData = {
  //   labels: ["Checkups", "Extractions", "Root Canals", "Cleanings"],
  //   datasets: [
  //     {
  //       data: [30, 20, 25, 25],
  //       backgroundColor: [
  //         "#FF6384",
  //         "#36A2EB",
  //         "#FFCE56",
  //         "#4BC0C0",
  //       ],
  //     },
  //   ],
  // };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-200 text-green-800";
      case "pending":
        return "bg-yellow-200 text-yellow-800";
      case "completed":
        return "bg-blue-200 text-blue-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Statistics Cards */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Citas de Hoy</h2>
            <FaUserAlt className="text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{appointments.length}</p>
        </div>

        {/* <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Average Wait Time</h2>
            <FaClock className="text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">12 mins</p>
        </div> */}

        {/* <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Patient Satisfaction</h2>
            <FaChartBar className="text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">94%</p>
        </div> */}

        {/* New Statistics Cards */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Ingresos de este Mes</h2>
            <FaDollarSign className="text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{monthIncome}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Cobros Pentidientes</h2>
            <FaFileInvoiceDollar className="text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">{pendingCollectionMoney}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Pacientes Totales</h2>
            <FaUsers className="text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-indigo-600">{patients.length}</p>
        </div>

        {/* Rest of the existing code remains the same until Patient List Section */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Proximas Citas</h2>
            <div className="flex gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
                <FaFilter />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments?.map((appointment) => {
                  const date = new Date(appointment.startDate);

                  // Extraer la fecha y hora
                  const fecha = date.toISOString().split('T')[0]; // "2024-11-28"
                  const hora = date.toISOString().split('T')[1].split('.')[0]; // "20:30:00"

                  return (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.name.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{fecha}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{format(parseISO(appointment?.startDate), 'HH:mm')} - {format(parseISO(appointment?.endDate), 'HH:mm')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.desc}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Updated Patient List Section with Avatars */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Patient List</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <FaSearch className="absolute left-2 top-3 text-gray-400" />
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredPatients?.map((patient) => {
              const fechaHoy = new Date();
              // console.log(patient.Appointment)
              const ultimaVisita = patient.Appointment?.filter((appointment) => {
                const fechaCita = new Date(appointment.startDate);
                return fechaCita < fechaHoy;
              });
              // sconsole.log(ultimaVisita);
              const proximaCita = patient.Appointment?.filter((appointment) => {
                const fechaCita = new Date(appointment.startDate);
                return fechaCita > fechaHoy;
              });
              // console.log(patient.name, proximaCita);
              // console.log(patient.name, proximaCita[priximaCita.lenght])
              return (
                <div key={patient.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {/* <img
                      src={patient.avatar}
                      alt={patient.name}
                      className="w-10 h-10 rounded-full object-cover"
                    /> */}
                      <Avatar>
                        <AvatarFallback>{patient.name}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{patient.name}</h3>
                        <p className="text-sm text-gray-600">{patient.telefono}</p>
                      </div>
                    </div>
                    <button
                      className="text-blue-500 hover:text-blue-600 text-sm"
                      onClick={() => router.push(`/pacientes/${encodeURIComponent(patient.name)}/?id=${patient.id}&name=${patient.name}`)}
                    >Ver Perfil
                    </button>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>ultima Visita: {ultimaVisita[ultimaVisita.length - 1]?.startDate?.split("T")[0]}</p>
                    <p>Siguiente Cita: {proximaCita[proximaCita.length - 1]?.startDate?.split("T")[0]}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Charts Section */}
        {/* <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-6">Patient Visits Trend</h2>
          <Line data={chartData} options={{ responsive: true }} />
        </div> */}

        {/* <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Procedure Distribution</h2>
          <Pie data={pieData} options={{ responsive: true }} />
        </div> */}

        {/* New Income Trend Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-3">
          <h2 className="text-xl font-semibold mb-6">Monthly Income Trend</h2>
          <Line data={incomeChartData} options={{ responsive: true }} />
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <FaSpinner className="animate-spin text-white text-4xl" />
        </div>
      )}
    </div>
  )
}