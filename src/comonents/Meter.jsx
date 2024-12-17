import React, { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto"; // For Chart.js v3+
import axios from "axios";

const SpeedometerChart = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Speed (km/h)",
        data: [],
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  });

  const [speed, setSpeed] = useState(50); // Initial speed
  const [isRunning, setIsRunning] = useState(false); // Toggle for Start Button
  const socketRef = useRef(null); // WebSocket Reference

  // Establish WebSocket connection on page load
  useEffect(() => {
    socketRef.current = new WebSocket("ws://192.168.1.169:8765");

    socketRef.current.onopen = () => {
      console.log("WebSocket connection established.");
    };

    socketRef.current.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    return () => {
      socketRef.current.close();
    };
  }, []);

  // Data generation and POST request logic
  const startDataGeneration = () => {
    if (isRunning) return; // Prevent duplicate intervals
    setIsRunning(true);

    const interval = setInterval(async () => {
      const newSpeed = Math.floor(Math.random() * 100) + 20; // Random speed (20-120)
      const currentTime = new Date().toLocaleTimeString();

      try {
        // Step 1: Send data to the backend
        const response = await axios.post("http://192.168.1.169:876/send", {
          speed: newSpeed,
          timestamp: currentTime,
        });

        console.log("Data sent to backend:", response.data);

        // Step 2: Send data via WebSocket
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({ speed: newSpeed, timestamp: currentTime })
          );
        }

        // Step 3: Update chart data
        setChartData((prevData) => ({
          labels: [...prevData.labels.slice(-19), currentTime],
          datasets: [
            {
              ...prevData.datasets[0],
              data: [...prevData.datasets[0].data.slice(-19), newSpeed],
            },
          ],
        }));

        setSpeed(newSpeed);
      } catch (error) {
        console.error("Error sending data:", error);
      }
    }, 1000); // Interval of 1 second

    // Stop generation on component unmount
    return () => clearInterval(interval);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Speedometer (Time Series)",
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Time" },
      },
      y: {
        title: { display: true, text: "Speed (km/h)" },
        min: 0,
        max: 150,
      },
    },
  };

  return (
    <div style={{ width: "700px", margin: "50px auto" }}>
      <h2>Current Speed: {speed} km/h</h2>
      <button
        onClick={startDataGeneration}
        disabled={isRunning}
        style={{
          padding: "10px 20px",
          marginBottom: "20px",
          backgroundColor: isRunning ? "gray" : "green",
          color: "white",
          border: "none",
          cursor: isRunning ? "not-allowed" : "pointer",
        }}
      >
        {isRunning ? "Running..." : "Start Data Generation"}
      </button>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default SpeedometerChart;
