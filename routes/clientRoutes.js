import express from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  bulkCreateClients
} from '../controllers/clientController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All client endpoints require authentication
router.use(protect);

// Admin-only endpoints
router.get('/', adminOnly, getClients);
router.post('/', adminOnly, createClient);
router.post('/bulk', adminOnly, bulkCreateClients);
router.put('/:id', adminOnly, updateClient);
router.delete('/:id', adminOnly, deleteClient);

// Individual client lookup (Admin or self)
router.get('/:id', getClientById);

export default router;
