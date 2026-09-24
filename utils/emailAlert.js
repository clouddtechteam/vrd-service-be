import nodemailer from 'nodemailer';
import User from '../models/User.js';

// Gmail SMTP Transporter with Dummy Credentials
// Replace with your real Gmail address and Google App Password in .env file:
// EMAIL_USER=your_email@gmail.com
// EMAIL_PASS=your_16_char_app_password
const createTransporter = () => {
  const user = process.env.EMAIL_USER || 'dummy.vrd.alert@gmail.com';
  const pass = process.env.EMAIL_PASS || 'dummypassword1234';

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
};

/**
 * Send an email alert to ALL admin users in the system when a service request is submitted
 * @param {Object} serviceRequest - Populated ServiceRequest document
 * @param {Object} [client] - Client user object (if not already populated in serviceRequest)
 */
export const sendNewServiceRequestAlert = async (serviceRequest, client = null) => {
  try {
    const transporter = createTransporter();
    const fromEmail = process.env.EMAIL_USER || 'dummy.vrd.alert@gmail.com';

    // Dynamically retrieve all active admin user emails from the database (not hardcoded)
    const adminUsers = await User.find({ role: 'admin', status: { $ne: 'inactive' } }).select('email');
    const adminEmails = [...new Set(adminUsers.map((u) => u.email).filter(Boolean))];

    // Optional environment fallback if DB has no admin users or extra notification address configured
    if (adminEmails.length === 0 && process.env.ADMIN_ALERT_EMAIL) {
      adminEmails.push(process.env.ADMIN_ALERT_EMAIL);
    }

    if (adminEmails.length === 0) {
      console.warn('[EmailAlert] No active admin users found to receive notification.');
      return { success: false, reason: 'No admin recipients found' };
    }

    const clientData = serviceRequest.client || client || {};
    const clientName = clientData.name || 'Unknown Client';
    const clientUserId = clientData.userId || 'N/A';
    const clientEmail = clientData.email || 'N/A';
    const clientCompany = clientData.company || 'N/A';
    const clientPhone = clientData.phone || serviceRequest.phone || 'N/A';

    const formattedExpectedDate = serviceRequest.expectedDate
      ? new Date(serviceRequest.expectedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Not specified';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 24px; text-align: center; }
          .badge { display: inline-block; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 9999px; margin-top: 8px; letter-spacing: 0.5px; }
          .body { padding: 24px; }
          .section-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
          .info-table td { padding: 8px 4px; vertical-align: top; }
          .info-label { color: #64748b; width: 140px; font-weight: 500; }
          .info-value { color: #0f172a; font-weight: 600; }
          .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 14px; line-height: 1.5; color: #334155; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700;">VRD Service Management</h2>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">New Service Request Alert</div>
            <div class="badge">${serviceRequest.requestId}</div>
          </div>
          <div class="body">
            <div class="section-title">Request Summary</div>
            <table class="info-table">
              <tr>
                <td class="info-label">Service Type:</td>
                <td class="info-value" style="color: #2563eb;">${serviceRequest.serviceType}</td>
              </tr>
              <tr>
                <td class="info-label">Expected Date:</td>
                <td class="info-value">${formattedExpectedDate}</td>
              </tr>
              <tr>
                <td class="info-label">Status:</td>
                <td class="info-value"><span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${serviceRequest.status || 'Pending'}</span></td>
              </tr>
              ${serviceRequest.storeName ? `
              <tr>
                <td class="info-label">Store Name:</td>
                <td class="info-value">${serviceRequest.storeName}</td>
              </tr>` : ''}
              ${serviceRequest.storeCode ? `
              <tr>
                <td class="info-label">Store Code:</td>
                <td class="info-value">${serviceRequest.storeCode}</td>
              </tr>` : ''}
              ${serviceRequest.managerName ? `
              <tr>
                <td class="info-label">Manager Name:</td>
                <td class="info-value">${serviceRequest.managerName}</td>
              </tr>` : ''}
            </table>

            <div class="section-title">Client Information</div>
            <table class="info-table">
              <tr>
                <td class="info-label">Client Name:</td>
                <td class="info-value">${clientName}</td>
              </tr>
              <tr>
                <td class="info-label">User ID:</td>
                <td class="info-value" style="font-family: monospace; color: #4338ca;">${clientUserId}</td>
              </tr>
              <tr>
                <td class="info-label">Company:</td>
                <td class="info-value">${clientCompany}</td>
              </tr>
              <tr>
                <td class="info-label">Email:</td>
                <td class="info-value">${clientEmail}</td>
              </tr>
              <tr>
                <td class="info-label">Phone:</td>
                <td class="info-value">${clientPhone}</td>
              </tr>
            </table>

            <div class="section-title">Problem Description</div>
            <div class="desc-box">
              ${serviceRequest.description}
            </div>

            ${serviceRequest.additionalInfo ? `
            <div class="section-title">Additional Info</div>
            <div class="desc-box">
              ${serviceRequest.additionalInfo}
            </div>` : ''}
          </div>
          <div class="footer">
            This is an automated notification from VRD Service Management System.
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"VRD Service Portal" <${fromEmail}>`,
      to: adminEmails,
      subject: `[VRD Alert] New Service Request Submitted: ${serviceRequest.requestId} (${serviceRequest.serviceType})`,
      html: htmlContent,
      text: `New Service Request ${serviceRequest.requestId} submitted by ${clientName} (${clientUserId}) for ${serviceRequest.serviceType}. Expected Date: ${formattedExpectedDate}. Description: ${serviceRequest.description}`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailAlert] New service request alert sent to admins [${adminEmails.join(', ')}]. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, recipients: adminEmails };
  } catch (error) {
    // Non-blocking error handling: Log clearly without breaking application flow
    console.error(`[EmailAlert Error] Failed to send email alert: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export default {
  sendNewServiceRequestAlert
};
