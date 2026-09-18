import User from '../models/User.js';

// @desc    Get paginated clients list
// @route   GET /api/clients
// @access  Private (Admin only)
export const getClients = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status ? req.query.status.trim() : '';

    const query = { role: 'client' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const total = await User.countDocuments(query);
    const clients = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: clients,
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
    console.error('[Get Clients Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
};

// @desc    Get single client by ID
// @route   GET /api/clients/:id
// @access  Private (Admin or Self)
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    // Only admin or the client itself can view
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own details.'
      });
    }

    const client = await User.findOne({ _id: id, role: 'client' }).select('-password');
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client details',
      error: error.message
    });
  }
};

// @desc    Create new client account (NO public registration, Admin only)
// @route   POST /api/clients
// @access  Private (Admin only)
export const createClient = async (req, res) => {
  try {
    const { name, email, password, phone, company, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const client = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'client',
      phone: phone ? phone.trim() : '',
      company: company ? company.trim() : '',
      status: status || 'active'
    });

    const clientData = client.toObject();
    delete clientData.password;

    res.status(201).json({
      success: true,
      message: 'Client account created successfully',
      data: clientData
    });
  } catch (error) {
    console.error('[Create Client Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create client account',
      error: error.message
    });
  }
};

// @desc    Update client account details
// @route   PUT /api/clients/:id
// @access  Private (Admin only)
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, status, password } = req.body;

    const client = await User.findOne({ _id: id, role: 'client' });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if new email is taken by another user
    if (email && email.toLowerCase().trim() !== client.email) {
      const emailTaken = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id }
      });
      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: 'This email is already in use by another account.'
        });
      }
      client.email = email.toLowerCase().trim();
    }

    if (name) client.name = name.trim();
    if (phone !== undefined) client.phone = phone.trim();
    if (company !== undefined) client.company = company.trim();
    if (status) client.status = status;
    if (password && password.trim().length >= 6) {
      client.password = password.trim();
    }

    await client.save();

    const updated = client.toObject();
    delete updated.password;

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('[Update Client Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: error.message
    });
  }
};

// @desc    Delete client account
// @route   DELETE /api/clients/:id
// @access  Private (Admin only)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await User.findOne({ _id: id, role: 'client' });
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Client account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: error.message
    });
  }
};

// @desc    Bulk create clients from Excel/CSV import
// @route   POST /api/clients/bulk
// @access  Private (Admin only)
export const bulkCreateClients = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of clients to import.'
      });
    }

    const created = [];
    const skipped = [];
    const processedEmails = new Set();

    for (const item of items) {
      const name = item.name ? String(item.name).trim() : '';
      const email = item.email ? String(item.email).toLowerCase().trim() : '';
      const phone = item.phone ? String(item.phone).trim() : '';
      const company = item.company ? String(item.company).trim() : '';
      const status = item.status ? String(item.status).toLowerCase().trim() : 'active';

      // Only name and email mandatory
      if (!name || !email) {
        skipped.push({
          name: name || 'Unnamed',
          email: email || 'No Email',
          reason: 'Missing name or email (both are mandatory)'
        });
        continue;
      }

      // Check for duplicate in current batch
      if (processedEmails.has(email)) {
        skipped.push({
          name,
          email,
          reason: 'Duplicate email in current file'
        });
        continue;
      }

      // Check if user with this email already exists in DB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        skipped.push({
          name,
          email,
          reason: 'Email already exists in database'
        });
        continue;
      }

      // Default password is email as per requirement
      const defaultPassword = email;

      const client = await User.create({
        name,
        email,
        password: defaultPassword,
        role: 'client',
        phone,
        company,
        status: ['active', 'inactive', 'pending'].includes(status) ? status : 'active'
      });

      const clientObj = client.toObject();
      delete clientObj.password;

      created.push(clientObj);
      processedEmails.add(email);
    }

    res.json({
      success: true,
      message: `Bulk client import completed: ${created.length} created, ${skipped.length} skipped.`,
      data: {
        createdCount: created.length,
        skippedCount: skipped.length,
        created,
        skipped
      }
    });
  } catch (error) {
    console.error('[Bulk Create Clients Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk import clients',
      error: error.message
    });
  }
};

