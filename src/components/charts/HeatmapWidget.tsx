import React from 'react';
// For demo: use a simple table as a heatmap. For advanced, use a dedicated heatmap library.
export default function HeatmapWidget({ data, xLabels, yLabels, title }: { data: number[][]; xLabels: string[]; yLabels: string[]; title?: string }) {
  const getColor = (value: number) => {
    const colors = ['#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#26c6da', '#00bcd4'];
    return colors[Math.min(colors.length - 1, Math.floor(value))];
  };
  return (
    <div>
      {title && <h4>{title}</h4>}
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th></th>
            {xLabels.map((x, i) => <th key={i}>{x}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, yIdx) => (
            <tr key={yIdx}>
              <td>{yLabels[yIdx]}</td>
              {row.map((val, xIdx) => (
                <td key={xIdx} style={{ background: getColor(val), width: 40, height: 30, textAlign: 'center' }}>{val}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
