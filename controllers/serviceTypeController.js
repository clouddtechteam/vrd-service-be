import ServiceType from '../models/ServiceType.js';

// @desc    Get all active service types
// @route   GET /api/service-types
// @access  Private (Authenticated users)
export const getServiceTypes = async (req, res) => {
  try {
    const serviceTypes = await ServiceType.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      data: serviceTypes
    });
  } catch (error) {
    console.error('[Get Service Types Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service types',
      error: error.message
    });
  }
};

// @desc    Create new service type
// @route   POST /api/service-types
// @access  Private (Admin only)
export const createServiceType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service type name is required.'
      });
    }

    const trimmedName = name.trim();
    const existing = await ServiceType.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Service type "${trimmedName}" already exists.`
      });
    }

    const serviceType = await ServiceType.create({
      name: trimmedName,
      description: description ? description.trim() : ''
    });

    res.status(201).json({
      success: true,
      message: 'Service type created successfully',
      data: serviceType
    });
  } catch (error) {
    console.error('[Create Service Type Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create service type',
      error: error.message
    });
  }
};

// @desc    Delete service type
// @route   DELETE /api/service-types/:id
// @access  Private (Admin only)
export const deleteServiceType = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceType = await ServiceType.findById(id);

    if (!serviceType) {
      return res.status(404).json({
        success: false,
        message: 'Service type not found.'
      });
    }

    await ServiceType.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Service type "${serviceType.name}" deleted successfully. Existing service requests are preserved.`
    });
  } catch (error) {
    console.error('[Delete Service Type Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service type',
      error: error.message
    });
  }
};

// @desc    Bulk create service types (from Excel/CSV import)
// @route   POST /api/service-types/bulk
// @access  Private (Admin only)
export const bulkCreateServiceTypes = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of service types to import.'
      });
    }

    const existingTypes = await ServiceType.find({}, 'name');
    const existingNames = new Set(existingTypes.map((t) => t.name.toLowerCase().trim()));

    const created = [];
    const skipped = [];

    for (const item of items) {
      const name = item.name ? String(item.name).trim() : '';
      const description = item.description ? String(item.description).trim() : '';

      if (!name) {
        skipped.push({ name: item.name || 'Unnamed', reason: 'Missing name' });
        continue;
      }

      if (existingNames.has(name.toLowerCase())) {
        skipped.push({ name, reason: 'Already exists' });
        continue;
      }

      const newType = await ServiceType.create({ name, description });
      created.push(newType);
      existingNames.add(name.toLowerCase());
    }

    res.json({
      success: true,
      message: `Bulk import completed: ${created.length} added, ${skipped.length} skipped.`,
      data: {
        createdCount: created.length,
        skippedCount: skipped.length,
        created,
        skipped
      }
    });
  } catch (error) {
    console.error('[Bulk Service Types Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk import service types',
      error: error.message
    });
  }
};
