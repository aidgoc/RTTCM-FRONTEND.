import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';

const CraneForm = ({ onSubmit, onCancel, initialData = null, isEditing = false }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    craneId: initialData?.craneId || '',
    name: initialData?.name || '',
    location: initialData?.location || '',
    swl: initialData?.swl || '',
    model: initialData?.specifications?.model || '',
    manufacturer: initialData?.specifications?.manufacturer || '',
    // Location fields
    city: initialData?.locationData?.city || '',
    siteAddress: initialData?.locationData?.siteAddress || '',
    // Manual coordinates (optional - for when MQTT GPS is not available)
    latitude: initialData?.locationData?.coordinates?.[1] || '',
    longitude: initialData?.locationData?.coordinates?.[0] || '',
    method: 'manual' // Manual entry until MQTT GPS is available
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // City options
  const cityOptions = [
    'HUBBALI-DHARWAD',
    'GADAG', 
    'BENGALURU',
    'MUMBAI',
    'DELHI',
    'CHENNAI',
    'KOLKATA',
    'HYDERABAD',
    'PUNE',
    'AHMEDABAD',
    'JAIPUR'
  ];

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.craneId.trim()) newErrors.craneId = 'Crane ID is required';
    if (!formData.name.trim()) newErrors.name = 'Crane name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.swl || formData.swl <= 0) newErrors.swl = 'SWL must be greater than 0';
    if (!formData.city) newErrors.city = 'City is required';
    
    // Validate coordinates if provided (optional)
    if (formData.latitude && (isNaN(parseFloat(formData.latitude)) || parseFloat(formData.latitude) < -90 || parseFloat(formData.latitude) > 90)) {
      newErrors.latitude = 'Latitude must be between -90 and 90';
    }
    if (formData.longitude && (isNaN(parseFloat(formData.longitude)) || parseFloat(formData.longitude) < -180 || parseFloat(formData.longitude) > 180)) {
      newErrors.longitude = 'Longitude must be between -180 and 180';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        craneId: formData.craneId.trim(),
        name: formData.name.trim(),
        location: formData.location.trim(),
        swl: parseFloat(formData.swl),
        city: formData.city,
        siteAddress: formData.siteAddress.trim(),
        specifications: {
          model: formData.model.trim(),
          manufacturer: formData.manufacturer.trim()
        },
        // Manual coordinates (optional - use if provided)
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        method: formData.latitude && formData.longitude ? 'manual' : 'city_default',
        accuracy: formData.latitude && formData.longitude ? 5 : 5000 // Manual entry is more accurate
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isEditing ? 'Edit Crane' : 'Add New Crane'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {isEditing ? 'Update crane information and location' : 'Create a new crane with location information'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crane ID *
            </label>
            <input
              type="text"
              name="craneId"
              value={formData.craneId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.craneId ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="TC-001"
              disabled={isEditing}
            />
            {errors.craneId && <p className="text-red-500 text-sm mt-1">{errors.craneId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crane Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tower Crane 1"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Construction Site A - North Wing"
            />
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SWL (kg) *
            </label>
            <input
              type="number"
              name="swl"
              value={formData.swl}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.swl ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="50000"
              min="1"
              max="100000"
            />
            {errors.swl && <p className="text-red-500 text-sm mt-1">{errors.swl}</p>}
          </div>
        </div>

        {/* Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="TC-5013"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Manufacturer
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Liebherr"
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City *
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select City</option>
              {cityOptions.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Address
            </label>
            <input
              type="text"
              name="siteAddress"
              value={formData.siteAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="123 Main Street, Industrial Area"
            />
          </div>

          {/* Manual GPS Coordinates (Optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Latitude (Optional)
                <span className="text-xs text-gray-500 ml-1 font-normal">Manual entry if GPS unavailable</span>
              </label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                step="0.000001"
                min="-90"
                max="90"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.latitude ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="12.9716"
              />
              {errors.latitude && <p className="text-red-500 text-sm mt-1">{errors.latitude}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Longitude (Optional)
                <span className="text-xs text-gray-500 ml-1 font-normal">Manual entry if GPS unavailable</span>
              </label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                step="0.000001"
                min="-180"
                max="180"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.longitude ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="77.5946"
              />
              {errors.longitude && <p className="text-red-500 text-sm mt-1">{errors.longitude}</p>}
            </div>
          </div>

        </div>

        {/* Location Information Section */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 dark:text-blue-400 text-lg">📍</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                Location Setup
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Enter GPS coordinates manually or use city-based location
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Manual Entry:</strong> If you have the exact GPS coordinates (latitude/longitude), enter them above for precise map positioning.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              📍 If coordinates are not provided, the system will use the city center as a fallback location. 
              MQTT GPS data will override manual coordinates when available.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Crane' : 'Create Crane')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CraneForm;