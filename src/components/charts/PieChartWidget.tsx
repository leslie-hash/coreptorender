import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28FD0', '#FF6699'];

export default function PieChartWidget({ data, dataKey, nameKey, title }: { data: Record<string, string | number | boolean>[]; dataKey: string; nameKey: string; title?: string }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      {title && <h4>{title}</h4>}
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
