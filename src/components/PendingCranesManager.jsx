import React, { useState, useEffect } from 'react';
import { useSocket } from '../lib/socket';
import { cranesAPI } from '../lib/api';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PendingCranesManager = ({ onCraneApproved }) => {
  const [pendingCranes, setPendingCranes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCrane, setSelectedCrane] = useState(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const { socket } = useSocket();

  // Fetch pending cranes
  const fetchPendingCranes = async () => {
    try {
      setLoading(true);
      const response = await cranesAPI.getPendingCranes();
      setPendingCranes(response?.data?.pendingCranes || []);
    } catch (error) {
      console.error('Error fetching pending cranes:', error);
      toast.error('Failed to fetch pending cranes');
    } finally {
      setLoading(false);
    }
  };

  // Listen for discovery events
  useEffect(() => {
    if (!socket) return;

    const handleCraneDiscovered = (data) => {
      console.log('New crane discovered:', data);
      toast.success(`New crane discovered: ${data.craneId}`);
      fetchPendingCranes(); // Refresh the list
    };

    const handleCraneApproved = (data) => {
      console.log('Crane approved:', data);
      toast.success(`Crane ${data.craneId} approved and activated`);
      fetchPendingCranes(); // Refresh the list
      onCraneApproved?.(data.crane);
    };

    const handleCraneRejected = (data) => {
      console.log('Crane rejected:', data);
      toast.error(`Crane ${data.craneId} rejected: ${data.reason}`);
      fetchPendingCranes(); // Refresh the list
    };

    socket.on('crane:discovered', handleCraneDiscovered);
    socket.on('crane:approved', handleCraneApproved);
    socket.on('crane:rejected', handleCraneRejected);

    return () => {
      socket.off('crane:discovered', handleCraneDiscovered);
      socket.off('crane:approved', handleCraneApproved);
      socket.off('crane:rejected', handleCraneRejected);
    };
  }, [socket, onCraneApproved]);

  // Initial fetch
  useEffect(() => {
    fetchPendingCranes();
  }, []);

  const handleApprove = (crane) => {
    setSelectedCrane(crane);
    setShowApprovalForm(true);
  };

  const handleReject = async (craneId) => {
    if (!confirm('Are you sure you want to reject this crane?')) return;

    try {
      await cranesAPI.rejectPendingCrane(craneId, 'Rejected by admin');
      toast.success('Crane rejected');
      fetchPendingCranes();
    } catch (error) {
      console.error('Error rejecting crane:', error);
      toast.error('Failed to reject crane');
    }
  };

  const handleApprovalSubmit = async (formData) => {
    try {
      await cranesAPI.approvePendingCrane(selectedCrane.craneId, formData);
      toast.success('Crane approved and activated');
      setShowApprovalForm(false);
      setSelectedCrane(null);
      fetchPendingCranes();
      if (onCraneApproved) {
        // Fetch the updated crane list to get the newly approved crane
        fetchPendingCranes();
      }
    } catch (error) {
      console.error('Error approving crane:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Failed to approve crane';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (pendingCranes.length === 0) {
    return (
      <div className="text-center py-8">
        <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Pending Cranes</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No new cranes have been discovered from MQTT data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Pending Cranes ({pendingCranes.length})
        </h3>
        <button
          onClick={fetchPendingCranes}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingCranes.map((crane) => (
          <div key={crane.craneId} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {/* Crane Icon */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md p-2">
                  <img 
                    src="https://cdn-icons-png.flaticon.com/128/10549/10549312.png" 
                    alt="Tower Crane" 
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    Crane {crane.craneId}
                  </h4>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Pending Approval
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <ClockIcon className="h-4 w-4 text-blue-500" />
                <span className="text-xs">
                  Discovered: {new Date(crane.discoveredAt).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-medium">
                    {crane.telemetryCount} telemetry messages received
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleApprove(crane)}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-1"
              >
                <CheckCircleIcon className="h-4 w-4" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleReject(crane.craneId)}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-1"
              >
                <XCircleIcon className="h-4 w-4" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Approval Form Modal */}
      {showApprovalForm && selectedCrane && (
        <ApprovalForm
          crane={selectedCrane}
          onSubmit={handleApprovalSubmit}
          onCancel={() => {
            setShowApprovalForm(false);
            setSelectedCrane(null);
          }}
        />
      )}
    </div>
  );
};

// Approval Form Component
const ApprovalForm = ({ crane, onSubmit, onCancel }) => {
  // Clean up default values - replace "Unknown" text
  const getCleanName = () => {
    if (crane.name.includes('Unknown')) {
      return `Crane ${crane.craneId}`;
    }
    return crane.name;
  };

  const getCleanLocation = () => {
    if (crane.location === 'Unknown Location' || crane.location === 'Pending Approval') {
      return '';
    }
    return crane.location;
  };

  const [formData, setFormData] = useState({
    name: getCleanName(),
    location: getCleanLocation(),
    swl: crane.swl || 5000, // Keep SWL from crane data, default to 5000kg
    managerUserId: '',
    operators: [],
    assignedSupervisors: []
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate name and location
    if (!formData.name || formData.name.trim() === '') {
      setError('Please provide a crane name');
      return;
    }
    
    if (!formData.location || formData.location.trim() === '') {
      setError('Please provide a location');
      return;
    }
    
    setError('');
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Approve Crane: {crane.craneId}
        </h3>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Crane Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Tower Crane Site-A, Mobile Crane #1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              💡 Give this crane a descriptive name (e.g., "Tower Crane Site-B")
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="e.g., Construction Site B, Warehouse 2, Bangalore"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              💡 Where is this crane located? (e.g., "Construction Site B")
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mt-2">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Load data will be received from MQTT telemetry
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Approve & Activate
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PendingCranesManager;
