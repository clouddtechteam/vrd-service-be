import ServiceRequest from '../models/ServiceRequest.js';
import User from '../models/User.js';

// Helper to generate unique human-readable Request ID
const generateRequestId = async () => {
  const currentYear = new Date().getFullYear();
  const count = await ServiceRequest.countDocuments();
  const paddedNumber = String(count + 1).padStart(4, '0');
  const candidateId = `SR-${currentYear}-${paddedNumber}`;

  // Verify uniqueness in case of concurrent creations
  const exists = await ServiceRequest.findOne({ requestId: candidateId });
  if (exists) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `SR-${currentYear}-${randomSuffix}`;
  }
  return candidateId;
};

// @desc    Create a new service request
// @route   POST /api/services
// @access  Private (Client or Admin)
export const createServiceRequest = async (req, res) => {
  try {
    const {
      serviceType,
      expectedDate,
      description,
      additionalInfo,
      managerName,
      storeName,
      storeCode,
      email,
      phone
    } = req.body;

    if (!serviceType || !serviceType.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please select or provide a service type.'
      });
    }

    if (!expectedDate) {
      return res.status(400).json({
        success: false,
        message: 'Please specify the expected service date.'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a description of the requested service.'
      });
    }

    // Automatically record client ID, request ID, request creation date/time, and initial status
    const clientId = req.user._id;
    const requestId = await generateRequestId();
    const initialStatus = 'Pending';
    const requestDate = new Date();

    const serviceRequest = await ServiceRequest.create({
      requestId,
      client: clientId,
      serviceType: serviceType.trim(),
      expectedDate: new Date(expectedDate),
      managerName: managerName ? managerName.trim() : '',
      storeName: storeName ? storeName.trim() : '',
      storeCode: storeCode ? storeCode.trim() : '',
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      description: description.trim(),
      additionalInfo: additionalInfo ? additionalInfo.trim() : '',
      status: initialStatus,
      requestDate
    });

    const populated = await ServiceRequest.findById(serviceRequest._id).populate(
      'client',
      'name email company phone'
    );

    res.status(201).json({
      success: true,
      message: 'Service request submitted successfully.',
      data: populated
    });
  } catch (error) {
    console.error('[Create Service Request Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create service request',
      error: error.message
    });
  }
};

// @desc    Get service requests belonging strictly to the logged-in client
// @route   GET /api/services/my-services
// @access  Private (Logged-in Client)
export const getMyServiceRequests = async (req, res) => {
  try {
    // Client must ONLY receive services associated with their own client ID
    const query = { client: req.user._id };

    const services = await ServiceRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('client', 'name email company phone');

    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    console.error('[Get My Services Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your service requests',
      error: error.message
    });
  }
};

// @desc    Get all service requests (Recent services for Admin Dashboard)
// @route   GET /api/services
// @access  Private (Admin only)
export const getAllServiceRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';

    const clientId = req.query.clientId ? req.query.clientId.trim() : '';

    let query = {};

    if (clientId) {
      query.client = clientId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      // Find matching clients first
      const matchingClients = await User.find({
        role: 'client',
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const clientIds = matchingClients.map((c) => c._id);

      const searchConditions = [
        { client: { $in: clientIds } },
        { requestId: { $regex: search, $options: 'i' } },
        { serviceType: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { managerName: { $regex: search, $options: 'i' } },
        { storeName: { $regex: search, $options: 'i' } },
        { storeCode: { $regex: search, $options: 'i' } }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const total = await ServiceRequest.countDocuments(query);
    // Services ordered with the most recently created requests first
    const services = await ServiceRequest.find(query)
      .populate('client', 'name email company phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: services,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('[Get All Services Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service requests',
      error: error.message
    });
  }
};

// @desc    Update service request status (Pending, Completed, Cancelled)
// @route   PATCH /api/services/:id/status
// @access  Private (Admin only)
export const updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status can only be "Pending", "In Progress", "Completed", or "Cancelled".'
      });
    }

    const service = await ServiceRequest.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    service.status = status;
    await service.save();

    const updatedService = await ServiceRequest.findById(id).populate(
      'client',
      'name email company phone'
    );

    res.json({
      success: true,
      message: `Service status successfully updated to ${status}`,
      data: updatedService
    });
  } catch (error) {
    console.error('[Update Service Status Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update service request status',
      error: error.message
    });
  }
};

// @desc    Get dashboard analytics overview
// @route   GET /api/services/analytics
// @access  Private (Admin only)
export const getAnalyticsOverview = async (req, res) => {
  try {
    const totalClients = await User.countDocuments({ role: 'client' });
    const activeClients = await User.countDocuments({ role: 'client', status: 'active' });
    const totalServices = await ServiceRequest.countDocuments();
    const pendingServices = await ServiceRequest.countDocuments({ status: 'Pending' });
    const inProgressServices = await ServiceRequest.countDocuments({ status: 'In Progress' });
    const completedServices = await ServiceRequest.countDocuments({ status: 'Completed' });
    const cancelledServices = await ServiceRequest.countDocuments({ status: 'Cancelled' });

    // Aggregated popular service categories
    const serviceTypeBreakdown = await ServiceRequest.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // 5 Most recent requests
    const recentActivity = await ServiceRequest.find()
      .populate('client', 'name email company')
      .sort({ createdAt: -1 })
      .limit(5);

    const completionRate =
      totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalClients,
        activeClients,
        totalServices,
        pendingServices,
        inProgressServices,
        completedServices,
        cancelledServices,
        completionRate,
        serviceTypeBreakdown,
        recentActivity
      }
    });
  } catch (error) {
    console.error('[Get Analytics Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};
