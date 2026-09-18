import express from 'express';
import {
  getServiceTypes,
  createServiceType,
  deleteServiceType,
  bulkCreateServiceTypes
} from '../controllers/serviceTypeController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require login for all service types
router.use(protect);

// GET is accessible to all authenticated clients & admins
router.get('/', getServiceTypes);

// Admin-only management endpoints
router.post('/', adminOnly, createServiceType);
router.delete('/:id', adminOnly, deleteServiceType);
router.post('/bulk', adminOnly, bulkCreateServiceTypes);

export default router;
