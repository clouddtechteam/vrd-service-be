import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client ID is required'],
      index: true
    },
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      trim: true
    },
    expectedDate: {
      type: Date,
      required: [true, 'Expected date is required']
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true
    },
    additionalInfo: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    requestDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
export default ServiceRequest;
