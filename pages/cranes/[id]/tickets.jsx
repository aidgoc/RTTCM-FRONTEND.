import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { ticketsAPI } from '../../../src/lib/api';
import { cranesAPI } from '../../../src/lib/api';
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  TicketIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function CraneTickets() {
  const router = useRouter();
  const { id } = router.query;

  // Fetch crane details
  const { data: craneData } = useQuery(
    ['crane', id],
    () => cranesAPI.getById(id),
    {
      enabled: !!id,
    }
  );

  // Fetch tickets for this crane
  const { data: ticketsResponse, isLoading } = useQuery(
    ['crane-tickets', id],
    () => ticketsAPI.getAll({ craneId: id, status: 'all' }),
    {
      enabled: !!id,
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  );

  const tickets = ticketsResponse?.data?.data?.tickets || ticketsResponse?.data?.tickets || [];
  const crane = craneData?.data || craneData;

  const getStatusBadge = (status) => {
    const badges = {
      open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-700',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-700'
    };
    return badges[status] || badges.open;
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    return badges[severity] || badges.medium;
  };

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/cranes/${id}`}
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Crane Details
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Tickets for {crane?.name || `Crane ${id}`}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {crane?.location || 'Crane Management System'}
              </p>
              {/* Info banner */}
              <div className="mt-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">ℹ️ Note:</span> Only MQTT TICKET commands (from crane operator) create new tickets. 
                  Orange-bordered tickets are old automatic alerts (now disabled).
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tickets.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {openTickets.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Open</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {resolvedTickets.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Tickets List */}
        {!isLoading && tickets.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <TicketIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Tickets Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no tickets for this crane.
            </p>
          </div>
        )}

        {!isLoading && tickets.length > 0 && (
          <div className="space-y-4">
            {/* Open Tickets */}
            {openTickets.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  Open Tickets ({openTickets.length})
                </h2>
                <div className="space-y-4">
                  {openTickets.map((ticket) => {
                    // Check if this is an automatic ticket (before we disabled the feature)
                    const isAutomaticTicket = ticket.title?.includes('overload condition detected') || 
                                             ticket.title?.includes('Limit switch') && ticket.title?.includes('failure detected') ||
                                             ticket.description?.includes('overload condition detected');
                    
                    return (
                      <div 
                        key={ticket._id || ticket.ticketId} 
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 ${
                          isAutomaticTicket 
                            ? 'border-orange-500' 
                            : 'border-red-500'
                        } p-6 hover:shadow-xl transition-shadow`}
                      >
                        {/* Warning badge for automatic tickets */}
                        {isAutomaticTicket && (
                          <div className="mb-3 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <span className="text-orange-600 dark:text-orange-400 font-semibold text-sm">
                              ⚠️ Old Automatic Ticket (Created before auto-tickets were disabled)
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {ticket.title}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusBadge(ticket.status)}`}>
                                {ticket.status.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityBadge(ticket.severity)}`}>
                                {ticket.severity.toUpperCase()}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                              {ticket.description}
                            </p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-500 dark:text-gray-400">Ticket ID</div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {ticket.ticketId || ticket.ticketNumber || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 dark:text-gray-400">Type</div>
                                <div className="font-semibold text-gray-900 dark:text-white capitalize">
                                  {ticket.type || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 dark:text-gray-400">Priority</div>
                                <div className="font-semibold text-gray-900 dark:text-white capitalize">
                                  {ticket.priority || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 dark:text-gray-400">Created</div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resolved Tickets */}
            {resolvedTickets.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  Resolved Tickets ({resolvedTickets.length})
                </h2>
                <div className="space-y-4">
                  {resolvedTickets.map((ticket) => (
                    <div 
                      key={ticket._id || ticket.ticketId} 
                      className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-green-500 p-6 hover:shadow-lg transition-shadow opacity-75"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {ticket.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusBadge(ticket.status)}`}>
                              {ticket.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {ticket.description}
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Ticket ID</div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {ticket.ticketId || ticket.ticketNumber || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Type</div>
                              <div className="font-semibold text-gray-900 dark:text-white capitalize">
                                {ticket.type || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Resolved</div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Created</div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                          
                          {ticket.resolution && (
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                                Resolution
                              </div>
                              <div className="text-sm text-green-700 dark:text-green-400">
                                {ticket.resolution}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

