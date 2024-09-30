"use client"
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registro de componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const IncomeExpenseChart: React.FC = () => {
  // Datos del gráfico
  const data = {
    labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'], // Ejemplo de meses
    datasets: [
      {
        label: 'Ingresos',
        data: [3000, 4000, 2500, 5000, 6000, 7000], // Ejemplo de datos de ingresos
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Egresos',
        data: [2000, 3000, 1500, 3500, 4000, 4500], // Ejemplo de datos de egresos
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  // Opciones del gráfico
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Gráfico de Ingresos y Egresos',
      },
    },
  };

  return (
    <div className="my-8">
      <Bar data={data} options={options} />
    </div>
  );
};

export default IncomeExpenseChart;