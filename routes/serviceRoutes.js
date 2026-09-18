import express from 'express';
import {
  createServiceRequest,
  getMyServiceRequests,
  getAllServiceRequests,
  updateServiceStatus,
  getAnalyticsOverview
} from '../controllers/serviceController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require login for all service endpoints
router.use(protect);

// Analytics overview (Admin only)
router.get('/analytics', adminOnly, getAnalyticsOverview);

// Client-specific endpoint: only returns logged-in client's services
router.get('/my-services', getMyServiceRequests);

// Create service request: client or admin
router.post('/', createServiceRequest);

// Admin-only endpoints: get all (recent first) and update status
router.get('/', adminOnly, getAllServiceRequests);
router.patch('/:id/status', adminOnly, updateServiceStatus);

export default router;
