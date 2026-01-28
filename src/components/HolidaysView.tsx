import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, RefreshCw } from 'lucide-react';
import { getApiUrl } from '@/utils/api';

interface Holiday {
  date: string;
  name: string;
  dayOfWeek: string;
  region?: string;
}

type HolidayRegion = 'zimbabwe' | 'us';

export default function HolidaysView() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeRegion, setActiveRegion] = useState<HolidayRegion>('zimbabwe');

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/holidays/${year}`));
      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays || []);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isUpcoming = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const isPast = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Filter holidays by region based on the region field from the API
  const zimbabweanHolidays = holidays.filter(h => h.region === 'zimbabwe' || !h.region);
  const usHolidays = holidays.filter(h => h.region === 'us');

  const displayHolidays = activeRegion === 'zimbabwe' ? zimbabweanHolidays : usHolidays;
  const upcomingHolidays = displayHolidays.filter(h => isUpcoming(h.date));
  const pastHolidays = displayHolidays.filter(h => isPast(h.date));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-blue-600 dark:border-blue-400 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-blue-900 dark:text-blue-100 tracking-tight">
            {year} Observed Holidays
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Observed holidays when offices are closed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <button
            onClick={fetchHolidays}
            className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            title="Refresh holidays"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Region Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-300 dark:border-gray-600">
        <button
          onClick={() => setActiveRegion('zimbabwe')}
          className={`px-6 py-3 font-bold text-base transition-all rounded-t-lg ${
            activeRegion === 'zimbabwe'
              ? 'text-white bg-blue-600 dark:bg-blue-500 border-b-4 border-blue-800 dark:border-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          🇿🇼 Zimbabwean Holidays
        </button>
        <button
          onClick={() => setActiveRegion('us')}
          className={`px-6 py-3 font-bold text-base transition-all rounded-t-lg ${
            activeRegion === 'us'
              ? 'text-white bg-blue-600 dark:bg-blue-500 border-b-4 border-blue-800 dark:border-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          🇺🇸 U.S. Holidays
        </button>
      </div>

      {/* Upcoming Holidays */}
      {upcomingHolidays.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingHolidays.map((holiday, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/60 dark:bg-gray-900/40 rounded-lg border border-blue-100 dark:border-blue-900 hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      {holiday.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {holiday.dayOfWeek}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatDate(holiday.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All {year} {activeRegion === 'zimbabwe' ? 'Zimbabwean' : 'U.S.'} Holidays
          </CardTitle>
          <CardDescription>
            Total: {displayHolidays.length} holidays
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayHolidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No {activeRegion === 'zimbabwe' ? 'Zimbabwean' : 'U.S.'} holidays available for {year}
            </div>
          ) : (
            <div className="space-y-2">
              {displayHolidays.map((holiday, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isPast(holiday.date)
                    ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 opacity-60'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
                }`}
              >
                <div>
                  <h3 className={`font-medium ${
                    isPast(holiday.date)
                      ? 'text-gray-600 dark:text-gray-500'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {holiday.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {holiday.dayOfWeek}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    isPast(holiday.date)
                      ? 'text-gray-500 dark:text-gray-600'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {formatDate(holiday.date)}
                  </p>
                  {isPast(holiday.date) && (
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      Past
                    </span>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
