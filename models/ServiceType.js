import mongoose from 'mongoose';

const serviceTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service type name'],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const ServiceType = mongoose.model('ServiceType', serviceTypeSchema);
export default ServiceType;
