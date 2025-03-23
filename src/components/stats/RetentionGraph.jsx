import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const RetentionGraph = ({ data, timeRange = 30 }) => {
  // Fill in missing dates with null values
  const fillMissingDates = (data, timeRange) => {
    if (!data || data.length === 0) return [];
    
    // Create map of existing dates
    const dateMap = {};
    data.forEach(item => {
      dateMap[item.date] = item;
    });
    
    // Create array of dates for the last N days
    const result = [];
    const today = new Date();
    
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (dateMap[dateStr]) {
        result.push(dateMap[dateStr]);
      } else {
        result.push({
          date: dateStr,
          accuracy: null,
          correct: 0,
          total: 0
        });
      }
    }
    
    return result;
  };
  
  // Process data
  const processedData = fillMissingDates(data, timeRange);
  
  // Check if we have any real data
  const hasData = processedData.some(item => item.total > 0);
  
  // If no data, show placeholder
  if (!hasData) {
    return (
      <div className="retention-graph-empty">
        <div className="retention-graph-empty-icon">📉</div>
        <div>No accuracy data available yet</div>
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length && payload[0].value !== null) {
      const data = payload[0].payload;
      
      return (
        <div className="retention-tooltip">
          <div className="retention-tooltip-title">
            {new Date(label).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
          <div className="retention-tooltip-row">
            <span className="retention-tooltip-label">Accuracy:</span>
            <span className="retention-tooltip-value">{data.accuracy.toFixed(1)}%</span>
          </div>
          <div className="retention-tooltip-row">
            <span className="retention-tooltip-label">Cards:</span>
            <span className="retention-tooltip-value">{data.correct} / {data.total}</span>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="retention-graph">
      <ResponsiveContainer width="100%" height="100%" className="retention-graph-container">
        <LineChart
          data={processedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fontSize: '0.8rem' }}
            tickMargin={5}
          />
          <YAxis 
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: '0.8rem' }}
            tickMargin={5}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={70} stroke="#FECA57" strokeDasharray="3 3" />
          <ReferenceLine y={90} stroke="#1DD1A1" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="var(--primary-color)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RetentionGraph;