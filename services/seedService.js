import User from '../models/User.js';
import ServiceType from '../models/ServiceType.js';
import ServiceRequest from '../models/ServiceRequest.js';

export const seedAdminAndDefaults = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vrdgroups.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'VRD Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        phone: '+91 98765 43210',
        company: 'VRD Groups Headquarters',
        status: 'active'
      });
      console.log(`[SEED] Admin created: ${adminEmail} (password: ${adminPassword})`);
    } else {
      console.log(`[SEED] Admin already exists: ${adminEmail}`);
    }

    // Remove old hardcoded personal test users if present
    const oldEmails = [
      'uvaizhnf@gmail.com',
      'draswathyanandpsychologist@gmail.com',
      'anushasebastiananice@gmail.com',
      'hussains001@gmail.com',
      'femiabdulla@gmail.com',
      'hafza.km@gmail.com'
    ];
    await User.deleteMany({ email: { $in: oldEmails } });

    // Ensure single standard demo client: John Doe
    const demoClientEmail = 'john.doe@vrdgroups.com';
    let demoClient = await User.findOne({ email: demoClientEmail });
    if (!demoClient) {
      demoClient = await User.create({
        name: 'John Doe',
        email: demoClientEmail,
        password: 'password123',
        role: 'client',
        phone: '+1 (555) 234-5678',
        company: 'Acme Health Solutions',
        status: 'active'
      });
      console.log(`[SEED] Seeded single demo client: ${demoClientEmail} (password: password123)`);
    }

    // Seed default Service Types in DB
    const serviceTypeCount = await ServiceType.countDocuments();
    if (serviceTypeCount === 0) {
      const defaultServiceTypes = [
        {
          name: 'HVAC Maintenance & Air Quality Audit',
          description: 'Quarterly inspection, HEPA filtration replacement, and airflow balancing for clinical facilities.'
        },
        {
          name: 'Biomedical Equipment Calibration',
          description: 'Precision testing and ISO compliance calibration for diagnostic and patient-care instruments.'
        },
        {
          name: 'Deep Sanitization & Sterilization',
          description: 'Hospital-grade antimicrobial sterilization and cleanroom decontamination protocol.'
        },
        {
          name: 'Electrical Infrastructure & UPS Audit',
          description: 'High-voltage safety diagnostics, surge suppression verification, and backup battery load testing.'
        },
        {
          name: 'IT & Network Security Compliance',
          description: 'Firewall hardening, HIPAA/data privacy compliance audit, and encrypted backup validation.'
        },
        {
          name: 'Fire Safety & Hazard Inspection',
          description: 'Comprehensive suppression system testing, emergency signage verification, and evacuation drill review.'
        }
      ];

      for (const st of defaultServiceTypes) {
        await ServiceType.create(st);
      }
      console.log(`[SEED] Seeded ${defaultServiceTypes.length} default service types.`);
    }

    // Clean up any orphan requests from deleted test emails
    await ServiceRequest.deleteMany({ client: { $nin: (await User.find({}, '_id')).map(u => u._id) } });

    // Seed sample Service Requests for John Doe if none exist
    const requestCount = await ServiceRequest.countDocuments();
    if (requestCount === 0 && demoClient) {
      await ServiceRequest.create([
        {
          requestId: 'SR-2026-0001',
          client: demoClient._id,
          serviceType: 'Biomedical Equipment Calibration',
          expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          description: 'Annual ISO recalibration required for diagnostic ultrasound units and vitals monitors.',
          additionalInfo: 'Units are located in Suite 204. Please coordinate access before 09:00 AM.',
          status: 'Pending',
          requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          requestId: 'SR-2026-0002',
          client: demoClient._id,
          serviceType: 'HVAC Maintenance & Air Quality Audit',
          expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          description: 'Routine quarterly particulate count check and HEPA filter overhaul for Wing B.',
          additionalInfo: 'Approved by facility manager.',
          status: 'Completed',
          requestDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      ]);
      console.log('[SEED] Seeded sample service requests for John Doe.');
    }
  } catch (error) {
    console.error('[SEED Error]:', error.message);
  }
};

