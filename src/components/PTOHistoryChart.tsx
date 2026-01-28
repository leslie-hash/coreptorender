import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface MonthlyPTOData {
  year: number;
  month: number;
  monthName: string;
  daysAccrued: number;
  currentPTO: number;
  totalTaken: number;
  leaveBalance: number;
}

interface PTOHistoryChartProps {
  monthlyHistory: MonthlyPTOData[];
  memberName: string;
}

export default function PTOHistoryChart({ monthlyHistory, memberName }: PTOHistoryChartProps) {
  if (!monthlyHistory || monthlyHistory.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            PTO History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No historical PTO data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by year and month
  const sortedHistory = [...monthlyHistory].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // Calculate min/max for scaling
  const maxBalance = Math.max(...sortedHistory.map(m => m.leaveBalance));
  const maxTaken = Math.max(...sortedHistory.map(m => m.totalTaken));
  const maxValue = Math.max(maxBalance, maxTaken, 20); // At least 20 for scale

  // Get trend
  const recentMonths = sortedHistory.slice(-3);
  const trend = recentMonths.length >= 2
    ? recentMonths[recentMonths.length - 1].leaveBalance - recentMonths[0].leaveBalance
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            PTO History - {memberName}
          </div>
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{Math.abs(trend).toFixed(1)} days</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span>Leave Balance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span>Total Taken</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="space-y-3">
            {sortedHistory.map((month, idx) => {
              const balanceHeight = (month.leaveBalance / maxValue) * 100;
              const takenHeight = (month.totalTaken / maxValue) * 100;
              
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium min-w-[120px]">{month.monthName}</span>
                    <div className="flex gap-4">
                      <span className="text-blue-600">Balance: {month.leaveBalance.toFixed(1)}</span>
                      <span className="text-red-600">Taken: {month.totalTaken.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end h-8">
                    {/* Balance Bar */}
                    <div className="flex-1 bg-gray-100 rounded relative overflow-hidden">
                      <div
                        className="bg-blue-500 rounded transition-all duration-300"
                        style={{ height: `${balanceHeight}%`, minHeight: balanceHeight > 0 ? '2px' : '0' }}
                      ></div>
                    </div>
                    {/* Taken Bar */}
                    <div className="flex-1 bg-gray-100 rounded relative overflow-hidden">
                      <div
                        className="bg-red-500 rounded transition-all duration-300"
                        style={{ height: `${takenHeight}%`, minHeight: takenHeight > 0 ? '2px' : '0' }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Table */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Monthly Breakdown</h4>
            <div className="max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Month</th>
                    <th className="pb-2 font-medium text-right">Accrued</th>
                    <th className="pb-2 font-medium text-right">Current PTO</th>
                    <th className="pb-2 font-medium text-right">Taken</th>
                    <th className="pb-2 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((month, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{month.monthName}</td>
                      <td className="py-2 text-right text-muted-foreground">{month.daysAccrued.toFixed(1)}</td>
                      <td className="py-2 text-right">{month.currentPTO.toFixed(1)}</td>
                      <td className="py-2 text-right text-red-600">{month.totalTaken.toFixed(1)}</td>
                      <td className="py-2 text-right text-blue-600 font-medium">{month.leaveBalance.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
