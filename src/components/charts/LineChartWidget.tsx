import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function LineChartWidget({ data, xKey, yKey, title }: { data: Record<string, string | number | boolean>[]; xKey: string; yKey: string; title?: string }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      {title && <h4>{title}</h4>}
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
