import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

function SensorChart({
  title,
  labels,
  values,
  unit,
}) {

  const data = {
    labels,

    datasets: [
      {
        label: title,
        data: values,
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },
    },

    scales: {
      x: {
        grid: {
          display: false,
        },
      },

      y: {
        grid: {
          color: "rgba(130,150,170,0.12)",
        },
      },
    },
  };

  return (
    <div className="chart-card">

      <div className="chart-header">

        <div>
          <span>
            SENSOR TREND
          </span>

          <h3>
            {title}
          </h3>
        </div>

        <small>
          {unit}
        </small>

      </div>

      <div className="chart-container">

        <Line
          data={data}
          options={options}
        />

      </div>

    </div>
  );
}

export default SensorChart;