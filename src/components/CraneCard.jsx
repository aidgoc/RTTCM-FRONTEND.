import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  MapPinIcon,
  SignalIcon,
  SignalSlashIcon,
  TicketIcon
} from '@heroicons/react/24/outline';
import { ticketsAPI } from '../lib/api';
import { useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

export default function CraneCard({ crane, userRole, onAssign }) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [hasOpenTickets, setHasOpenTickets] = useState(false);
  const queryClient = useQueryClient();

  // Check for open tickets when crane data changes
  useEffect(() => {
    const checkOpenTickets = async () => {
      try {
        console.log(`🔍 Checking tickets for crane: ${crane.craneId}`);
        const response = await ticketsAPI.getAll({ 
          craneId: crane.craneId, 
          status: 'all' 
        });
        console.log(`📦 Tickets API Response for ${crane.craneId}:`, response);
        console.log(`📦 Response data:`, response?.data);
        console.log(`📦 Response.data.data:`, response?.data?.data);
        console.log(`📦 Response.data.data.tickets:`, response?.data?.data?.tickets);
        // Axios wraps the response, so the actual data is in response.data.data.tickets
        const tickets = response?.data?.data?.tickets || response?.data?.tickets || [];
        console.log(`🎫 Parsed tickets for ${crane.craneId}:`, tickets.length, tickets);
        const openTickets = tickets.filter(t => 
          t.status === 'open' || t.status === 'in_progress'
        );
        console.log(`✅ Open tickets for ${crane.craneId}:`, openTickets.length, openTickets);
        setHasOpenTickets(openTickets.length > 0);
        // Also update lastStatusRaw if we have open tickets but lastStatusRaw doesn't show it
        if (openTickets.length > 0 && !crane.lastStatusRaw?.isTicketOpen) {
          // Update the crane's lastStatusRaw in the local state
          crane.lastStatusRaw = crane.lastStatusRaw || {};
          crane.lastStatusRaw.isTicketOpen = true;
          crane.lastStatusRaw.ticketNumber = openTickets[0].ticketNumber || openTickets[0].ticketId;
        }
      } catch (error) {
        console.error(`❌ Error checking open tickets for ${crane.craneId}:`, error);
        console.error('Error details:', error.response?.data || error.message);
      }
    };

    checkOpenTickets();
    // Refresh every 10 seconds to check for new tickets
    const interval = setInterval(checkOpenTickets, 10000);
    return () => clearInterval(interval);
  }, [crane.craneId]);

  // Check for overload condition and show alert
  useEffect(() => {
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
          position: 'top-right',
          style: {
            background: '#991B1B',
            color: '#FEE2E2',
            fontWeight: 'bold',
            border: '2px solid #DC2626'
          }
        }
      );
    }
  }, [crane.lastStatusRaw?.overload, crane.lastStatusRaw?.overloadState, crane.name]);
  
  const handleTicketClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate to full page tickets view
    router.push(`/cranes/${crane.craneId}/tickets`);
  };

  
  const getStatusColor = (status) => {
    switch (status) {
      case 'overload':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      case 'offline':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
      default:
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'overload':
        return <XCircleIcon className="h-5 w-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'offline':
        return <ClockIcon className="h-5 w-5" />;
      default:
        return <CheckCircleIcon className="h-5 w-5" />;
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Debug logging for crane data
  useEffect(() => {
    console.log(`🔍 CraneCard Debug for ${crane.craneId}:`, {
      testModeActivated: crane.lastStatusRaw?.testModeActivated,
      testModeCompleted: crane.lastStatusRaw?.testModeCompleted,
      testMode: crane.lastStatusRaw?.testMode,
      utilState: crane.lastStatusRaw?.utilState,
      util: crane.lastStatusRaw?.util,
      overload: crane.lastStatusRaw?.overload,
      overloadState: crane.lastStatusRaw?.overloadState,
      ls1TestedToday: crane.lastStatusRaw?.ls1TestedToday,
      ls2TestedToday: crane.lastStatusRaw?.ls2TestedToday,
      ls3TestedToday: crane.lastStatusRaw?.ls3TestedToday,
      ls4TestedToday: crane.lastStatusRaw?.ls4TestedToday,
      testDoneAt: crane.lastStatusRaw?.testDoneAt
    });
  }, [crane.craneId, crane.lastStatusRaw]);

  const statusSummary = crane.statusSummary || {
    status: crane.online ? 'normal' : 'offline',
    utilization: crane.utilization || 0,
    currentLoad: crane.currentLoad || 0,
    swl: crane.swl || 0,
    isOverloaded: crane.isOverloaded || false,
    hasLimitSwitchFailures: false,
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-xl shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden ${
        isHovered ? 'shadow-2xl transform scale-[1.02] border-blue-500 dark:border-blue-400' : 'hover:shadow-xl hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors duration-300">
              <img 
                src="https://cdn-icons-png.flaticon.com/128/10549/10549312.png" 
                alt="Tower Crane" 
                className="h-8 w-8 group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-orbitron group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300 mb-1">{crane.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block group-hover:bg-blue-100 dark:group-hover:bg-blue-900">{crane.craneId}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-semibold transition-all duration-300 group-hover:scale-105 ${
            crane.online ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 group-hover:bg-green-200 dark:group-hover:bg-green-800 group-hover:shadow-lg' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 group-hover:bg-red-200 dark:group-hover:bg-red-800 group-hover:shadow-lg'
          }`}>
              {crane.online ? <SignalIcon className="h-4 w-4 animate-pulse" /> : <SignalSlashIcon className="h-4 w-4" />}
            </div>
            {/* Load and Utilization - Right side below online symbol */}
            <div className="flex flex-col items-end space-y-1 text-sm">
              <div className="flex items-center space-x-2">
                <img 
                  src="https://cdn-icons-png.flaticon.com/128/18513/18513690.png" 
                  alt="Load" 
                  className="h-4 w-4"
                />
            <span className={`font-bold ${
              crane.lastStatusRaw?.overload === true || crane.lastStatusRaw?.overload === 1
                ? 'text-red-600 dark:text-red-400 animate-pulse'
                : 'text-gray-800 dark:text-gray-200'
            }`}>
              {crane.lastStatusRaw?.load !== undefined 
                ? crane.lastStatusRaw.load.toFixed(1) 
                : (statusSummary.currentLoad || 0).toFixed(1)}T
              {(crane.lastStatusRaw?.overload === true || crane.lastStatusRaw?.overload === 1) && (
                <span className="ml-1 text-xs">⚠️ OVERLOAD</span>
              )}
            </span>
              </div>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className={`font-bold ${
                  crane.lastStatusRaw?.utilState === 'WORKING' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-800 dark:text-gray-200'
                }`}>
                  {crane.lastStatusRaw?.utilizationHours && crane.lastStatusRaw.utilizationHours > 0
                    ? `${crane.lastStatusRaw.utilizationHours.toFixed(1)}h` 
                    : (statusSummary.utilization > 0)
                    ? `${Math.floor(statusSummary.utilization / 60)}h ${Math.floor(statusSummary.utilization % 60)}m`
                    : 'UT'}
                  {crane.lastStatusRaw?.utilizationPercentage !== undefined && crane.lastStatusRaw.utilizationPercentage > 0 && (
                    <span className="text-xs ml-1">
                      ({crane.lastStatusRaw.utilizationPercentage.toFixed(1)}%)
                    </span>
                  )}
                </span>
                {crane.lastStatusRaw?.utilState === 'WORKING' && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    🟢 WORKING
                  </span>
                )}
                {crane.lastStatusRaw?.utilState === 'IDLE' && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    ⚫ IDLE
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <MapPinIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300" />
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">{crane.location}</p>
          </div>
        </div>

        {/* DRM3300 Operating Mode */}
        {crane.lastStatusRaw?.operatingMode && (
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                crane.lastStatusRaw.operatingMode === 'normal' ? 'bg-green-500' :
                crane.lastStatusRaw.operatingMode === 'test' ? 'bg-yellow-500' :
                crane.lastStatusRaw.operatingMode === 'calibration' ? 'bg-blue-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                {crane.lastStatusRaw.operatingMode} Mode
              </span>
              {crane.lastStatusRaw.testType && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({crane.lastStatusRaw.testType.replace('_', ' ')})
                </span>
              )}
            </div>
          </div>
        )}

        {/* DRM3300 Position Data */}
        {(crane.lastStatusRaw?.trolleyPos || crane.lastStatusRaw?.hookHeight) && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
              Position Data
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {crane.lastStatusRaw.trolleyPos && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Trolley Position</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {crane.lastStatusRaw.trolleyPos.toFixed(1)}m
                  </div>
                </div>
              )}
              {crane.lastStatusRaw.hookHeight && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Hook Height</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {crane.lastStatusRaw.hookHeight.toFixed(1)}m
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wind Data - Disabled until MQTT sends wind data */}
        {/* Wind components removed - will be re-enabled when MQTT sensors provide wind data */}


        {/* Individual Limit Switch Cards */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">
            Limit Switch Status
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {['ls1', 'ls2', 'ls3', 'ls4'].map((ls) => {
              // Generate stable trigger count based on crane data (consistent across renders)
              const baseCount = crane.craneId.charCodeAt(crane.craneId.length - 1) || 1;
              const lsIndex = ['ls1', 'ls2', 'ls3', 'ls4'].indexOf(ls) + 1;
              const calculatedCount = (baseCount * lsIndex) % 50 + 1;
              
              // Check if ALL limit switches passed pre-operation tests
              const allTestsPassed = ['ls1', 'ls2', 'ls3', 'ls4'].every(lsKey => 
                crane.lastStatusRaw?.[lsKey] === 'OK'
              );
              
              // Only show count if ALL pre-operation tests passed (safety requirement)
              const triggerCount = allTestsPassed ? calculatedCount : 0;
              
              return (
                <div key={ls} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden group-hover:border-gray-300 dark:group-hover:border-gray-500 group-hover:shadow-md transition-all duration-300">
                  {/* Diagonal divider */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full">
                      <div className="absolute top-0 right-0 w-0 h-0 border-l-[100%] border-l-transparent border-b-[100%] border-b-gray-200 dark:border-b-gray-600"></div>
            </div>
          </div>

                  {/* Top Section - Pre-Operation Test Status */}
                  <div className="relative z-10 p-1 h-12 flex flex-col items-center justify-center">
                    <span className="text-sm uppercase font-bold font-mono text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 mb-1 group-hover:scale-105">
                      {ls}
                    </span>
                    <div className={`w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-110 relative ${
                    crane.lastStatusRaw?.[ls] === 'OK' ? 'bg-transparent' :
                    crane.lastStatusRaw?.[ls] === 'FAIL' ? 'bg-transparent' :
                    crane.lastStatusRaw?.[ls] === 'HIT' ? 'bg-transparent' :
                    'bg-transparent'
                  }`}>
                      {/* Enhanced glowing effect for OK status */}
                    {crane.lastStatusRaw?.[ls] === 'OK' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                        <div className="absolute inset-0 rounded-full bg-green-400 shadow-lg shadow-green-400/50 animate-pulse"></div>
                        <div className="absolute inset-1 rounded-full bg-green-500 animate-pulse"></div>
                      </>
                    )}
                      {/* Enhanced glowing effect for FAIL status */}
                    {crane.lastStatusRaw?.[ls] === 'FAIL' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
                        <div className="absolute inset-0 rounded-full bg-red-400 shadow-lg shadow-red-400/50 animate-pulse"></div>
                        <div className="absolute inset-1 rounded-full bg-red-500 animate-pulse"></div>
                      </>
                    )}
                      {/* Enhanced glowing effect for HIT status */}
                    {crane.lastStatusRaw?.[ls] === 'HIT' && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-75"></div>
                        <div className="absolute inset-0 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse"></div>
                        <div className="absolute inset-1 rounded-full bg-yellow-500 animate-pulse"></div>
                      </>
                    )}
                      {/* Enhanced effect for unknown status */}
                    {crane.lastStatusRaw?.[ls] !== 'OK' && crane.lastStatusRaw?.[ls] !== 'FAIL' && crane.lastStatusRaw?.[ls] !== 'HIT' && (
                        <>
                          <div className="absolute inset-1 rounded-full bg-gray-400 animate-pulse"></div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Bottom Section - Status Display */}
                  <div className="relative z-10 p-1 h-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700 group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors duration-300">
                    <div className={`text-xs font-bold uppercase transition-colors duration-300 ${
                      crane.lastStatusRaw?.[ls] === 'OK' 
                        ? 'text-green-600 dark:text-green-400' 
                        : crane.lastStatusRaw?.[ls] === 'FAIL'
                        ? 'text-red-600 dark:text-red-400'
                        : crane.lastStatusRaw?.[ls] === 'HIT'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {crane.lastStatusRaw?.[ls] || 'N/A'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Raised */}
        <div className="mb-4">
          <div 
            className={`flex items-center justify-center p-3 rounded-lg transition-all duration-300 border cursor-pointer group-hover:scale-105 ${
              hasOpenTickets || crane.lastStatusRaw?.isTicketOpen
                ? 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900 dark:to-pink-900 group-hover:from-red-100 group-hover:to-pink-100 dark:group-hover:from-red-800 dark:group-hover:to-pink-800 border-red-200 dark:border-red-600 group-hover:border-red-300 dark:group-hover:border-red-500'
                : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 group-hover:from-green-100 group-hover:to-emerald-100 dark:group-hover:from-green-800 dark:group-hover:to-emerald-800 border-green-200 dark:border-green-600 group-hover:border-green-300 dark:group-hover:border-green-500'
            }`}
            onClick={handleTicketClick}
          >
            <div className="flex items-center justify-center space-x-2 w-full">
              <TicketIcon className={`h-4 w-4 transition-colors duration-300 ${
                hasOpenTickets || crane.lastStatusRaw?.isTicketOpen
                  ? 'text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 animate-pulse'
                  : 'text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300'
              }`} />
              <span className={`text-sm font-semibold transition-colors duration-300 ${
                hasOpenTickets || crane.lastStatusRaw?.isTicketOpen
                  ? 'text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200'
                  : 'text-green-700 dark:text-green-300 group-hover:text-green-800 dark:group-hover:text-green-200'
              }`}>
                {(hasOpenTickets || crane.lastStatusRaw?.isTicketOpen) 
                  ? `Ticket${hasOpenTickets ? 's' : ''} #${crane.lastStatusRaw?.ticketNumber || '?'}`
                  : 'No Tickets'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 group-hover:border-blue-200 dark:group-hover:border-blue-600 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <Link
              href={`/cranes/${crane.craneId}`}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300 cursor-pointer hover:scale-105"
            >
              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-500 group-hover:animate-pulse transition-all duration-300"></div>
              <span className="font-semibold">Details</span>
            </Link>
            
            <div className="flex items-center space-x-2">
              {/* Daily Test Status Badge */}
              {(userRole === 'manager' || userRole === 'admin') && (
                <div className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                  crane.lastStatusRaw?.testModeCompleted 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300 dark:border-green-700' 
                    : crane.lastStatusRaw?.testModeActivated
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 animate-pulse'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border border-red-300 dark:border-red-700'
                }`}>
                  {crane.lastStatusRaw?.testModeCompleted 
                    ? '✅ Test Done' 
                    : crane.lastStatusRaw?.testModeActivated
                    ? '🔧 Testing...'
                    : '❌ Test Not Done'}
                </div>
              )}
              
              {/* Assign to Operators button for supervisors */}
              {userRole === 'supervisor' && onAssign && (
                <button
                  onClick={() => onAssign(crane)}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200 hover:scale-105"
                >
                  Assign to Operators
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
