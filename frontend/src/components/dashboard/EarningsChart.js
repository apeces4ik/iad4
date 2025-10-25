/**
 * EarningsChart Component
 * Displays earnings over time with Chart.js
 * Supports daily, weekly, and monthly views
 * Строки 450-465 файла "цель" (Day 50-52: Dashboard Page)
 */

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EarningsChart({ earningsData = [] }) {
  const [timeframe, setTimeframe] = useState('daily'); // daily, weekly, monthly

  // Generate sample data if none provided
  const generateSampleData = () => {
    const days = timeframe === 'daily' ? 7 : timeframe === 'weekly' ? 4 : 12;
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      if (timeframe === 'daily') {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        data.push(Math.random() * 10 + 5); // 5-15 AETH per day
      } else if (timeframe === 'weekly') {
        labels.push(`Week ${4 - i}`);
        data.push(Math.random() * 50 + 30); // 30-80 AETH per week
      } else {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
        data.push(Math.random() * 200 + 100); // 100-300 AETH per month
      }
    }
    
    return { labels, data };
  };

  const chartData = earningsData.length > 0 ? earningsData : generateSampleData();

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Earnings (AETH)',
        data: chartData.data,
        fill: true,
        borderColor: 'rgb(6, 182, 212)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(6, 182, 212)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
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
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgb(6, 182, 212)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${context.parsed.y.toFixed(2)} AETH`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
          callback: function(value) {
            return value.toFixed(0) + ' AETH';
          }
        },
      },
    },
  };

  const totalEarnings = chartData.data.reduce((sum, val) => sum + val, 0);
  const avgEarnings = totalEarnings / chartData.data.length;

  return (
    <Card className="earnings-chart-card">
      <CardHeader>
        <div className="chart-header">
          <CardTitle>Earnings Overview</CardTitle>
          <div className="timeframe-selector">
            <Button
              variant={timeframe === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('daily')}
            >
              Daily
            </Button>
            <Button
              variant={timeframe === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('weekly')}
            >
              Weekly
            </Button>
            <Button
              variant={timeframe === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe('monthly')}
            >
              Monthly
            </Button>
          </div>
        </div>
        <div className="chart-stats">
          <div className="chart-stat">
            <span className="stat-label">Total</span>
            <span className="stat-value">{totalEarnings.toFixed(2)} AETH</span>
          </div>
          <div className="chart-stat">
            <span className="stat-label">Average</span>
            <span className="stat-value">{avgEarnings.toFixed(2)} AETH</span>
          </div>
          <div className="chart-stat">
            <span className="stat-label">Trend</span>
            <span className="stat-value trend-up">↑ 12.5%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="chart-container" style={{ height: '300px' }}>
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
