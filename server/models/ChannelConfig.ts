import mongoose from 'mongoose';

const roomTypeMappingSchema = new mongoose.Schema({
  crmCategory: { type: String, required: true },
  channelRoomTypeCode: { type: String, required: true },
  channelRoomTypeName: { type: String }
}, { _id: false });

const ratePlanMappingSchema = new mongoose.Schema({
  crmCategory: { type: String, required: true },
  channelRatePlanId: { type: String, required: true },
  channelRatePlanName: { type: String }
}, { _id: false });

const channelConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'default' },
  provider: { type: String, enum: ['STAAH', 'eZee', 'Beds24', 'Other'], required: true },
  apiKey: { type: String, required: true },
  apiEndpoint: { type: String, required: true },
  propertyId: { type: String, required: true },
  webhookSecret: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  roomTypeMappings: [roomTypeMappingSchema],
  ratePlanMappings: [ratePlanMappingSchema],
  ipWhitelist: [{ type: String }],
  lastSyncAt: { type: String, default: null },
  lastSyncStatus: { type: String, enum: ['success', 'failed', null], default: null }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

export const ChannelConfig = mongoose.model('ChannelConfig', channelConfigSchema);
