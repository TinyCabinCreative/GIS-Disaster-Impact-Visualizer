import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from '../services/api';
import '../styles/analytics.css';

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [byType, setByType] = useState([]);
  const [trends, setTrends] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, byTypeRes, trendsRes, severityRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/by-type'),
        api.get('/analytics/trends?startDate=2024-01-01'),
        api.get('/analytics/severity-distribution')
      ]);

      setOverview(overviewRes.data.data);
      setByType(byTypeRes.data.data);
      setTrends(trendsRes.data.data);
      setSeverity(severityRes.data.data);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  };

  const COLORS = {
    earthquake: '#FF8C00',
    wildfire: '#FF4500',
    flood: '#4169E1',
    hurricane: '#8B008B',
    tornado: '#DC143C',
    severe_weather: '#FFD700',
    winter_storm: '#87CEEB',
    drought: '#D2691E'
  };

  const SEVERITY_COLORS = {
    minor: '#4CAF50',
    moderate: '#FFC107',
    severe: '#FF9800',
    extreme: '#F44336'
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const typeChartData = byType.map(item => ({
    name: item.type.replace('_', ' ').toUpperCase(),
    total: parseInt(item.total_count),
    active: parseInt(item.active_count)
  }));

  const severityByType = severity.reduce((acc, item) => {
    const existing = acc.find(a => a.type === item.type);
    if (existing) {
      existing[item.severity] = parseInt(item.count);
    } else {
      acc.push({
        type: item.type.replace('_', ' ').toUpperCase(),
        [item.severity]: parseInt(item.count)
      });
    }
    return acc;
  }, []);

  // Aggregate trends by month
  const trendsByMonth = trends.reduce((acc, item) => {
    const month = new Date(item.month).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    const existing = acc.find(a => a.month === month);
    if (existing) {
      existing.count += parseInt(item.count);
    } else {
      acc.push({
        month,
        count: parseInt(item.count)
      });
    }
    return acc;
  }, []);

  return (
    <div className="page-container analytics-page">
      <h1>Disaster Analytics Dashboard</h1>
      
      {/* Overview Stats */}
      <div className="overview-stats">
        <div className="stat-card">
          <div className="stat-value">{overview.total_disasters}</div>
          <div className="stat-label">Total Disasters</div>
        </div>
        <div className="stat-card active">
          <div className="stat-value">{overview.active_disasters}</div>
          <div className="stat-label">Currently Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview.disaster_types}</div>
          <div className="stat-label">Disaster Types</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        
        {/* Disasters by Type */}
        <div className="chart-card">
          <h3>Disasters by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f5f" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="#90caf9"
              />
              <YAxis stroke="#90caf9" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e2738', 
                  border: '1px solid #2a3f5f',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="#4fc3f7" name="Total" />
              <Bar dataKey="active" fill="#ff6b6b" name="Active" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Disaster Trends Over Time */}
        <div className="chart-card">
          <h3>Disaster Trends (Monthly)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f5f" />
              <XAxis 
                dataKey="month" 
                stroke="#90caf9"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#90caf9" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e2738', 
                  border: '1px solid #2a3f5f',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#4fc3f7" 
                strokeWidth={3}
                name="Disaster Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution */}
        <div className="chart-card">
          <h3>Severity Distribution by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f5f" />
              <XAxis 
                dataKey="type" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                stroke="#90caf9"
              />
              <YAxis stroke="#90caf9" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e2738', 
                  border: '1px solid #2a3f5f',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="minor" stackId="a" fill={SEVERITY_COLORS.minor} name="Minor" />
              <Bar dataKey="moderate" stackId="a" fill={SEVERITY_COLORS.moderate} name="Moderate" />
              <Bar dataKey="severe" stackId="a" fill={SEVERITY_COLORS.severe} name="Severe" />
              <Bar dataKey="extreme" stackId="a" fill={SEVERITY_COLORS.extreme} name="Extreme" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Active vs Inactive */}
        <div className="chart-card">
          <h3>Active vs Historical Disasters</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Active', value: parseInt(overview.active_disasters) },
                  { 
                    name: 'Historical', 
                    value: parseInt(overview.total_disasters) - parseInt(overview.active_disasters) 
                  }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#ff6b6b" />
                <Cell fill="#4fc3f7" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Detailed Table */}
      <div className="table-card">
        <h3>Disaster Type Summary</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Total Count</th>
              <th>Active</th>
              <th>Avg Area (sq km)</th>
              <th>Most Recent</th>
            </tr>
          </thead>
          <tbody>
            {byType.map(item => (
              <tr key={item.type}>
                <td className="type-cell">
                  <span 
                    className="type-indicator" 
                    style={{ backgroundColor: COLORS[item.type] }}
                  />
                  {item.type.replace('_', ' ').toUpperCase()}
                </td>
                <td>{item.total_count}</td>
                <td>{item.active_count}</td>
                <td>{item.avg_area_sq_km ? parseFloat(item.avg_area_sq_km).toFixed(2) : 'N/A'}</td>
                <td>{new Date(item.most_recent).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;