import { useState } from 'react';
import { useQuery } from 'react-query';
import { ticketsAPI, cranesAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';

export default function Tickets() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    type: 'all',
    craneId: '', // New crane ID filter
  });

  const { data, isLoading } = useQuery(
    ['tickets', filters],
    () => ticketsAPI.getAll(filters),
    {
      refetchInterval: 10000, // Auto-refresh every 10 seconds
      refetchIntervalInBackground: true,
    }
  );

  // Fetch available cranes for the dropdown
  const { data: cranesData } = useQuery(
    'cranes',
    () => cranesAPI.getAll(),
    {
      refetchInterval: 5000,
    }
  );

  const availableCranes = cranesData?.data?.cranes || [];

  const allTickets = data?.data?.data?.tickets || [];

  // Backend already handles role-based filtering and craneId
  // No need for additional frontend filtering
  const tickets = allTickets;

  // Debug logging
  console.log('🎫 Filters applied:', filters);
  console.log('🎫 Tickets received from API:', allTickets.length);
  console.log('🎫 First 3 tickets:', allTickets.slice(0, 3).map(t => ({
    id: t.ticketId || t._id,
    craneId: t.craneId,
    title: t.title,
    status: t.status
  })));

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <span className="status-critical">Critical</span>;
      case 'warning':
        return <span className="status-warning">Warning</span>;
      case 'info':
        return <span className="status-normal">Info</span>;
      default:
        return <span className="status-normal">{severity}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="status-warning">Open</span>;
      case 'in_progress':
        return <span className="status-normal">In Progress</span>;
      case 'resolved':
        return <span className="status-normal">Resolved</span>;
      case 'closed':
        return <span className="status-offline">Closed</span>;
      default:
        return <span className="status-normal">{status}</span>;
    }
  };

  const getTypeIcon = (type) => {
    // Map to the 15 crane problems from DRM_3400 TICKET command (Table 7)
    switch (type) {
      // DRM TICKET Types (from Table 7)
      case 'mechanical':
        return '⚙️'; // Trolley, Hook, Jib, Gearbox, Bearing, Motor problems
      case 'electrical':
        return '⚡'; // Electric problems, 2-Phase supply
      case 'safety':
        return '🚨'; // Limit switch, inclination, brake problems
      case 'operational':
        return '🔧'; // Joystick, sensor, rope problems
      case 'maintenance':
        return '🛠️'; // Motor overheat, general maintenance
      // Legacy types (still supported)
      case 'overload':
        return '⚠️';
      case 'limit_switch':
        return '🔧';
      case 'offline':
        return '📴';
      case 'utilization':
        return '📊';
      case 'manual':
        return '✋';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
          <p className="text-gray-600 dark:text-gray-300">Monitor and manage MQTT-generated tickets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card hover:shadow-lg hover:border-cyan-400/60 dark:hover:border-cyan-500/60 transition-all duration-300">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Tickets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Crane ID Filter - FIRST */}
            <div>
              <label className="form-label font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Crane ID
              </label>
              <select
                className="form-input border-2 border-blue-300 dark:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400"
                value={filters.craneId}
                onChange={(e) => setFilters({ ...filters, craneId: e.target.value })}
              >
                <option value="">🏗️ All Cranes</option>
                {availableCranes.map((crane) => (
                  <option key={crane.craneId} value={crane.craneId}>
                    {crane.craneId} {crane.name ? `- ${crane.name}` : ''}
                  </option>
                ))}
              </select>
              {filters.craneId && (
                <button
                  onClick={() => setFilters({ ...filters, craneId: '' })}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filter
                </button>
              )}
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Severity</label>
              <select
                className="form-input"
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="form-label">Type</label>
              <select
                className="form-input"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">All Types</option>
                {/* DRM TICKET Types (from Table 7) */}
                <option value="mechanical">⚙️ Mechanical</option>
                <option value="electrical">⚡ Electrical</option>
                <option value="safety">🚨 Safety</option>
                <option value="operational">🔧 Operational</option>
                <option value="maintenance">🛠️ Maintenance</option>
                {/* Legacy types */}
                <option value="overload">⚠️ Overload</option>
                <option value="limit_switch">🔧 Limit Switch</option>
                <option value="offline">📴 Offline</option>
                <option value="utilization">📊 Utilization</option>
                <option value="manual">✋ Manual</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active Filters:</span>
            {filters.craneId && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full font-semibold">
                🏗️ Crane: {filters.craneId}
                <button
                  onClick={() => setFilters({ ...filters, craneId: '' })}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-full">
                Status: {filters.status}
              </span>
            )}
            {filters.severity !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-full">
                Severity: {filters.severity}
              </span>
            )}
            {filters.type !== 'all' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-full">
                Type: {filters.type}
              </span>
            )}
            {(filters.craneId || filters.status !== 'all' || filters.severity !== 'all' || filters.type !== 'all') && (
              <button
                onClick={() => setFilters({ status: 'all', severity: 'all', type: 'all', craneId: '' })}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tickets Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-bold text-gray-900 dark:text-white">{tickets.length}</span> ticket{tickets.length !== 1 ? 's' : ''}
          {filters.craneId && (
            <span> for crane <span className="font-bold text-blue-600 dark:text-blue-400">{filters.craneId}</span></span>
          )}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 cursor-pointer group relative overflow-hidden">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                    {getTypeIcon(ticket.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {ticket.title || ticket.message || 'Untitled Ticket'}
                      </h3>
                      {getSeverityBadge(ticket.severity)}
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">🏗️ Crane:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{ticket.craneId}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">📋 Type:</span>
                          <span className="capitalize">{(ticket.type || '').replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">🕐 Created:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {new Date(ticket.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                            {' at '}
                            {new Date(ticket.createdAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                        {ticket.ticketId && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">🎫 ID:</span>
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              {ticket.ticketId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {ticket.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                        {ticket.description}
                      </div>
                    )}
                    {ticket.resolution && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-md group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors duration-300">
                        <span className="font-medium">Resolution:</span> {ticket.resolution}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tickets.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {Object.values(filters).some(f => f !== 'all')
              ? 'Try adjusting your filter criteria.'
              : 'No tickets have been created yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
