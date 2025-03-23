import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const ProgressChart = ({ data, total }) => {
  // Format data for pie chart
  const chartData = [
    { name: 'Again', value: data[1] || 0, color: '#FF6B6B' }, // Red
    { name: 'Hard', value: data[2] || 0, color: '#FECA57' },  // Yellow
    { name: 'Good', value: data[3] || 0, color: '#48DBFB' },  // Blue
    { name: 'Easy', value: data[4] || 0, color: '#1DD1A1' }   // Green
  ].filter(item => item.value > 0); // Only show non-zero values
  
  // If no data, show placeholder
  if (total === 0 || chartData.length === 0) {
    return (
      <div className="chart-empty-state">
        <div className="chart-empty-icon">📊</div>
        <div>No quiz data available yet</div>
      </div>
    );
  }
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="chart-tooltip">
          <div className="chart-tooltip-title">
            <span 
              className="chart-tooltip-dot" 
              style={{ backgroundColor: data.color }}
            ></span>
            {data.name}
          </div>
          <div className="chart-tooltip-row">
            Count: <span className="chart-tooltip-value">{data.value}</span>
          </div>
          <div className="chart-tooltip-row">
            Percentage: <span className="chart-tooltip-value">{percentage}%</span>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Custom legend
  const CustomLegend = ({ payload }) => {
    return (
      <div className="chart-legend">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="chart-legend-item">
            <div 
              className="chart-legend-dot" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="progress-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={chartData.length > 1 ? 5 : 0}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;