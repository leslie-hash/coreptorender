import Sentiment from 'sentiment';
const sentiment = new Sentiment();

export function aggregate(data, field, op) {
  const values = data.map(row => Number(row[field])).filter(v => !isNaN(v));
  if (op === 'sum') return values.reduce((a, b) => a + b, 0);
  if (op === 'avg') return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  if (op === 'min') return Math.min(...values);
  if (op === 'max') return Math.max(...values);
  return null;
}

export function groupBy(data, field) {
  return data.reduce((acc, row) => {
    const key = row[field] || 'Unknown';
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
}

export function trend(data, dateField, valueField) {
  const series = {};
  data.forEach(row => {
    const date = row[dateField];
    const value = Number(row[valueField]);
    if (!date || isNaN(value)) return;
    series[date] = (series[date] || 0) + value;
  });
  return Object.entries(series).map(([date, value]) => ({ date, value }));
}

export function predict(series) {
  const n = series.length;
  if (n < 2) return null;
  const x = series.map((_, i) => i + 1);
  const y = series.map(s => s.value);
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const num = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
  const den = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
  const slope = num / den;
  const intercept = yMean - slope * xMean;
  const nextX = n + 1;
  const nextY = intercept + slope * nextX;
  return { slope, intercept, nextX, nextY };
}

export function analyzeSentiment(text) {
  return sentiment.analyze(text);
}