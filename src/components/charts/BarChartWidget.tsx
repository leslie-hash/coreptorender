import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function BarChartWidget({ data, xKey, yKey, title }: { data: Record<string, string | number | boolean>[]; xKey: string; yKey: string; title?: string }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      {title && <h4>{title}</h4>}
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={yKey} fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
