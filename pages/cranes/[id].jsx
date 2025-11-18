import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { cranesAPI } from '../../src/lib/api';
import { useSocket } from '../../src/lib/socket';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, ReferenceLine } from 'recharts';
import { 
  WifiIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

export default function CraneDetail() {
  const router = useRouter();
  const id = typeof window !== 'undefined' ? (router.query?.id || new URLSearchParams(window.location.search).get('id')) : undefined;
  const { connected, subscribeToTelemetry } = useSocket();
  const [realTimeData, setRealTimeData] = useState(null);
  
  // Date range filter state
  const [dateFrom, setDateFrom] = useState(() => {
    // Default: 7 days ago
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    // Default: today
    return new Date().toISOString().split('T')[0];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const historyLimit = 100;

  const { data, isLoading, refetch } = useQuery(
    ['crane', id],
    () => cranesAPI.getById(id),
    {
      enabled: !!id,
    }
  );

  const { data: telemetryData } = useQuery(
    ['crane-telemetry', id],
    () => cranesAPI.getTelemetryStats(id, { from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }),
    {
      enabled: !!id,
    }
  );

  // Fetch telemetry history with date range
  const { data: telemetryHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery(
    ['crane-telemetry-history', id, dateFrom, dateTo, currentPage],
    () => cranesAPI.getTelemetryHistory(id, { 
      from: new Date(dateFrom).toISOString(), 
      to: new Date(dateTo + 'T23:59:59').toISOString(), 
      page: currentPage, 
      limit: historyLimit 
    }),
    {
      enabled: !!id && !!dateFrom && !!dateTo,
      keepPreviousData: true, // Keep previous data while loading new page
    }
  );

  // Extract crane data early (before hooks)
  const crane = data?.data;
  const telemetry = telemetryData?.data;

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!connected || !id || !subscribeToTelemetry) return;

    const unsubscribe = subscribeToTelemetry(id, (data) => {
      setRealTimeData(data);
      refetch(); // Refresh crane data
      toast.success(`Real-time update for ${id}`);
    });

    return unsubscribe;
  }, [connected, id, refetch, subscribeToTelemetry]);

  // Check for overload condition and show alert
  useEffect(() => {
    if (!crane) return;
    
    const isOverloaded = crane.lastStatusRaw?.overload === true || crane.lastStatusRaw?.overload === 1;
    const overloadState = crane.lastStatusRaw?.overloadState;
    
    if (isOverloaded && overloadState === 'OVERLOAD') {
      const overloadMinutes = crane.lastStatusRaw?.currentOverloadMinutes || 0;
      const todayEvents = crane.lastStatusRaw?.todayOverloadEvents || 0;
      const riskLevel = crane.lastStatusRaw?.riskLevel || 'LOW';
      
      // Show toast alert for overload
      toast.error(
        `⚠️ OVERLOAD ALERT: ${crane.name}\n` +
        `Current overload: ${overloadMinutes.toFixed(1)} minutes\n` +
        `Events today: ${todayEvents}\n` +
        `Risk Level: ${riskLevel}`,
        {
          duration: 8000,
          position: 'top-center',
          style: {
            background: '#991B1B',
            color: '#FEE2E2',
            fontWeight: 'bold',
            border: '2px solid #DC2626',
            fontSize: '16px'
          }
        }
      );
    }
  }, [crane?.lastStatusRaw?.overload, crane?.lastStatusRaw?.overloadState, crane?.name]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  // Not found state
  if (!crane) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Crane Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300">The requested crane could not be found.</p>
        </div>
      </div>
    );
  }

  // Format data for charts
  const formatUtilizationTrend = (data) => {
    if (!data || data.length === 0) return [];
    
    // Generate hourly data for the last 24 hours
    const now = new Date();
    const hourlyData = [];
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourNum = hour.getHours();
      
      // Find data for this hour
      const hourData = data.find(item => item._id.hour === hourNum);
      
      hourlyData.push({
        hour: hourNum,
        utilization: hourData ? Math.round(hourData.avgUtilization || 0) : 0,
        time: `${hourNum.toString().padStart(2, '0')}:00`,
        displayTime: hourNum === 0 ? '00:00' : 
                    hourNum === 4 ? '04:00' :
                    hourNum === 8 ? '08:00' :
                    hourNum === 12 ? '12:00' :
                    hourNum === 16 ? '16:00' :
                    hourNum === 20 ? '20:00' : ''
      });
    }
    
    return hourlyData;
  };

  const formatPeakLoadTrend = (data) => {
    if (!data || data.length === 0) return [];
    
    // Generate daily data for the last 7 days
    const now = new Date();
    const dailyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayNum = day.getDate();
      const monthNum = day.getMonth() + 1;
      
      // Find data for this day
      const dayData = data.find(item => 
        item._id.day === dayNum && item._id.month === monthNum
      );
      
      dailyData.push({
        day: 7 - i,
        peakLoad: dayData ? Math.round(dayData.maxLoad || 0) : 0,
        avgLoad: dayData ? Math.round(dayData.avgLoad || 0) : 0,
        minLoad: dayData ? Math.round((dayData.avgLoad || 0) * 0.6) : 0,
        maxLoad: dayData ? Math.round(dayData.maxLoad || 0) : 0,
        q1Load: dayData ? Math.round((dayData.avgLoad || 0) * 0.8) : 0,
        q3Load: dayData ? Math.round((dayData.avgLoad || 0) * 1.2) : 0,
        date: `${monthNum}/${dayNum}`,
        dayName: day.toLocaleDateString('en', { weekday: 'short' })
      });
    }
    
    return dailyData;
  };

  // Format chart data
  const utilizationTrendData = formatUtilizationTrend(telemetry?.utilizationTrend);
  const peakLoadTrendData = formatPeakLoadTrend(telemetry?.peakLoadTrend);

  // Debug logging
  console.log('Chart Data Debug:', {
    rawPeakLoadTrend: telemetry?.peakLoadTrend,
    formattedPeakLoadTrend: peakLoadTrendData
  });

  // Use lastStatusRaw for most accurate real-time data
  const currentLoad = crane.lastStatusRaw?.load !== undefined 
    ? crane.lastStatusRaw.load 
    : (realTimeData?.data?.load || crane.currentLoad || 0);
  const swl = crane.swl || 100;
  const utilization = crane.lastStatusRaw?.utilizationPercentage !== undefined
    ? crane.lastStatusRaw.utilizationPercentage
    : (realTimeData?.data?.util || crane.utilization || 0);
  // Check overload from OL bit, not just load > swl
  const isOverloaded = crane.lastStatusRaw?.overload === true || crane.lastStatusRaw?.overload === 1;
  
  // Debug logging
  console.log(`🔍 Crane Details Debug for ${crane.craneId}:`, {
    testMode: crane.lastStatusRaw?.testMode,
    utilState: crane.lastStatusRaw?.utilState,
    utilizationPercentage: crane.lastStatusRaw?.utilizationPercentage,
    overload: crane.lastStatusRaw?.overload,
    overloadState: crane.lastStatusRaw?.overloadState,
    load: crane.lastStatusRaw?.load,
    currentLoad
  });


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{crane.name}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{crane.craneId} • {crane.location}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
            crane.online 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            <WifiIcon className={`h-4 w-4 ${crane.online ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-red-600 dark:text-red-400'}`} />
            <span>{crane.online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Real-time Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Connection Status */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection Status</p>
              <div className="flex items-center space-x-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${crane.online ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {crane.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Last seen {crane.lastSeen 
                  ? new Date(crane.lastSeen).toLocaleTimeString()
                  : 'Never'
                }
              </p>
              </div>
            <WifiIcon className={`h-8 w-8 ${crane.online ? 'text-green-500 animate-pulse' : 'text-red-500'}`} />
          </div>
        </div>

        {/* Limit Switches */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Limit Switches</p>
            <div className="grid grid-cols-2 gap-3">
              {['ls1', 'ls2', 'ls3', 'ls4'].map((ls) => {
                const status = crane.lastStatusRaw?.[ls] || 'UNKNOWN';
                const dotColor = status === 'OK' ? 'bg-green-400' : 
                                 status === 'HIT' ? 'bg-yellow-400 animate-pulse' : 
                                 status === 'FAIL' ? 'bg-red-400 animate-pulse' : 
                                 'bg-gray-400';
                const textColor = status === 'OK' ? 'text-green-600 dark:text-green-400' : 
                                  status === 'HIT' ? 'text-yellow-600 dark:text-yellow-400' : 
                                  status === 'FAIL' ? 'text-red-600 dark:text-red-400' : 
                                  'text-gray-500';
                return (
                  <div key={ls} className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${dotColor}`}></div>
                    <span className="text-xs font-semibold uppercase">{ls}</span>
                    <span className={`text-xs font-bold ${textColor}`}>({status})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Load Status */}
        <div className={`bg-white dark:bg-gray-800 border rounded-xl shadow-lg p-6 ${
          isOverloaded 
            ? 'border-red-500 dark:border-red-600 animate-pulse' 
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Current Load</p>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-bold ${isOverloaded ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                {currentLoad}t
              </span>
              {isOverloaded && (
                <span className="text-xs font-bold text-red-600 dark:text-red-400">⚠️ OVERLOAD</span>
              )}
            </div>
            {isOverloaded && (
              <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                <p className="text-xs text-red-700 dark:text-red-300 font-bold flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1 animate-pulse" />
                  OVERLOAD CONDITION DETECTED!
                </p>
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  <p>Duration: {(crane.lastStatusRaw?.currentOverloadMinutes || 0).toFixed(1)} min</p>
                  <p>Events Today: {crane.lastStatusRaw?.todayOverloadEvents || 0}</p>
                  <p>Risk Level: {crane.lastStatusRaw?.riskLevel || 'UNKNOWN'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Utilization */}
        <div className={`bg-white dark:bg-gray-800 border rounded-xl shadow-lg p-6 ${
          crane.lastStatusRaw?.utilState === 'WORKING'
            ? 'border-green-500 dark:border-green-600'
            : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Utilization 
              {crane.lastStatusRaw?.utilState && (
                <span className={`ml-2 text-xs font-bold ${
                  crane.lastStatusRaw.utilState === 'WORKING' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {crane.lastStatusRaw.utilState === 'WORKING' ? '🟢 WORKING' : '⚫ IDLE'}
                </span>
              )}
            </p>
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${
                crane.lastStatusRaw?.utilState === 'WORKING'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {crane.lastStatusRaw?.utilizationPercentage !== undefined 
                  ? `${crane.lastStatusRaw.utilizationPercentage.toFixed(1)}%`
                  : `${utilization}%`}
              </span>
              {crane.lastStatusRaw?.utilState === 'WORKING' && (
                <ArrowUpIcon className="h-4 w-4 text-green-500 animate-pulse" />
              )}
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Today: {crane.lastStatusRaw?.utilizationHours?.toFixed(2) || '0.00'}h
                {crane.lastStatusRaw?.currentSessionHours > 0 && (
                  <span className="ml-2 text-green-600 dark:text-green-400 font-semibold">
                    (Session: {crane.lastStatusRaw.currentSessionHours.toFixed(2)}h)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total elapsed: {crane.lastStatusRaw?.totalDayHours?.toFixed(1) || '0.0'}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Trend Chart */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Utilization Trend (24h)</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="h-80">
              {utilizationTrendData && utilizationTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={utilizationTrendData}>
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      axisLine={{ stroke: '#374151' }}
                      tickFormatter={(value, index) => {
                        return utilizationTrendData[index]?.displayTime || '';
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      axisLine={{ stroke: '#374151' }}
                      ticks={[0, 25, 50, 75, 100]}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Utilization']}
                      labelFormatter={(label) => `Time: ${label}`}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="utilization" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No utilization data available</p>
                    <p className="text-sm">Data will appear when crane sends telemetry</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Peak Load Trend Chart - Box Plot */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Peak Load Trend (7 days)</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="h-80">
              {peakLoadTrendData && peakLoadTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={peakLoadTrendData}>
                    <XAxis 
                      dataKey="dayName" 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => `${value}kg`}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const dayData = peakLoadTrendData.find(d => d.dayName === value);
                        return [
                          `Min: ${dayData?.minLoad || 0}kg\nQ1: ${dayData?.q1Load || 0}kg\nAvg: ${dayData?.avgLoad || 0}kg\nQ3: ${dayData?.q3Load || 0}kg\nMax: ${dayData?.maxLoad || 0}kg`,
                          'Load Distribution'
                        ];
                      }}
                      labelFormatter={(label) => `Day: ${label}`}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB',
                        whiteSpace: 'pre-line'
                      }}
                    />
                    {/* Box plot representation using area and lines */}
                    <Area 
                      dataKey="q1Load" 
                      fill="#E5E7EB"
                      stroke="#9CA3AF"
                      strokeWidth={1}
                      name="Q1 Load"
                    />
                    <Area 
                      dataKey="avgLoad" 
                      fill="#10B981"
                      stroke="#059669"
                      strokeWidth={2}
                      name="Average Load"
                    />
                    <Area 
                      dataKey="q3Load" 
                      fill="#9CA3AF"
                      stroke="#6B7280"
                      strokeWidth={1}
                      name="Q3 Load"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minLoad" 
                      stroke="#D1D5DB"
                      strokeWidth={2}
                      dot={{ fill: '#D1D5DB', strokeWidth: 2, r: 3 }}
                      name="Min Load"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="maxLoad" 
                      stroke="#374151"
                      strokeWidth={2}
                      dot={{ fill: '#374151', strokeWidth: 2, r: 3 }}
                      name="Max Load"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No peak load data available</p>
                    <p className="text-sm">Data will appear when crane sends telemetry</p>
                  </div>
                </div>
              )}
            </div>
            {/* Box Plot Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <span>Min</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-500 dark:bg-gray-500 rounded"></div>
                <span>Q1</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Average</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-500 dark:bg-gray-500 rounded"></div>
                <span>Q3</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <span>Max</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Telemetry History Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Telemetry History</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                All telemetry events with TEST, UTIL, OL, and Limit Switch status
              </p>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">From:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on filter change
                  }}
                  max={dateTo}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on filter change
                  }}
                  min={dateFrom}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  refetchHistory();
                  toast.success('History refreshed!');
                }}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {/* Stats Row */}
          {telemetryHistory?.data && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Total Records:</span>
                <span className="font-bold text-gray-900 dark:text-white">{telemetryHistory.data.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Page:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {telemetryHistory.data.page} / {telemetryHistory.data.totalPages}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Showing:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {telemetryHistory.data.history?.length || 0} records
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Loading State */}
        {historyLoading && (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* Table */}
        {!historyLoading && telemetryHistory?.data?.history && telemetryHistory.data.history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TEST</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UTIL</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">OL</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Load (t)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS1<br/><span className="text-xs normal-case">(Status & Hits)</span></th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS2<br/><span className="text-xs normal-case">(Status & Hits)</span></th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS3<br/><span className="text-xs normal-case">(Status & Hits)</span></th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">LS4<br/><span className="text-xs normal-case">(Status & Hits)</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {telemetryHistory.data.history.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    {/* Date & Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{record.date}</div>
                        <div className="text-gray-500 dark:text-gray-400">{record.time}</div>
                      </div>
                    </td>
                    
                    {/* TEST bit - Daily test status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                        record.testMode 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {record.testDone}
                      </span>
                    </td>
                    
                    {/* UTIL bit - Crane operation */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                        record.utilBit === 1 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {record.utilization}
                      </span>
                    </td>
                    
                    {/* OL bit - Overload status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                        record.overloadBit === 1 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {record.overload}
                      </span>
                    </td>
                    
                    {/* Load (DRM device only sends LOAD, not SWL) */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {record.load}t
                      </span>
                    </td>
                    
                    {/* LS1 - Status & Hit Count */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.ls1 === 'HIT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          record.ls1 === 'OK' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          record.ls1 === 'FAIL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {record.ls1}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          Hits: {record.ls1HitCount || 0}
                        </span>
                      </div>
                    </td>
                    
                    {/* LS2 - Status & Hit Count */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.ls2 === 'HIT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          record.ls2 === 'OK' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          record.ls2 === 'FAIL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {record.ls2}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          Hits: {record.ls2HitCount || 0}
                        </span>
                      </div>
                    </td>
                    
                    {/* LS3 - Status & Hit Count */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.ls3 === 'HIT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          record.ls3 === 'OK' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          record.ls3 === 'FAIL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {record.ls3}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          Hits: {record.ls3HitCount || 0}
                        </span>
                      </div>
                    </td>
                    
                    {/* LS4 - Status & Hit Count */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          record.ls4 === 'HIT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          record.ls4 === 'OK' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          record.ls4 === 'FAIL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {record.ls4}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          Hits: {record.ls4HitCount || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Empty State */}
        {!historyLoading && (!telemetryHistory?.data?.history || telemetryHistory.data.history.length === 0) && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No telemetry data found</p>
            <p className="text-sm mt-2">Try adjusting the date range or wait for crane to send data</p>
          </div>
        )}
        
        {/* Pagination */}
        {telemetryHistory?.data && telemetryHistory.data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {telemetryHistory.data.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(telemetryHistory.data.totalPages, prev + 1))}
              disabled={currentPage === telemetryHistory.data.totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Recent Tickets */}
      {crane.recentTickets && crane.recentTickets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {crane.recentTickets.map((ticket) => (
                <div key={ticket._id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      ticket.severity === 'critical' ? 'bg-red-400' :
                      ticket.severity === 'warning' ? 'bg-yellow-400' :
                      'bg-blue-400'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ticket.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.type} • {ticket.severity}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(ticket.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
