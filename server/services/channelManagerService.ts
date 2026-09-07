import { ChannelConfig } from '../models/ChannelConfig.js';
import { calculateAvailability } from './availabilityCalculator.js';
import { Log } from '../models/Log.js';
import { randomUUID } from 'crypto';

// Generic abstracted outbound pusher. In reality this formats XML/JSON specifically for STAAH, eZee, etc.
const makeChannelApiCall = async (config: any, endpoint: string, method: string, payload: any) => {
  if (!config.apiEndpoint || !config.apiKey) {
    throw new Error('Channel Manager configuration incomplete');
  }

  // Uses fetch internally
  const response = await fetch(`${config.apiEndpoint}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'x-property-id': config.propertyId
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  if (!response.ok) {
    throw new Error(`Channel API returned ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const logSyncAction = async (action: string, details: string) => {
  console.log(`[Channel Sync] ${action}: ${details}`);
  try {
    await Log.create({
      _id: `LOG-${randomUUID().slice(0, 8).toUpperCase()}`,
      action,
      details,
      userId: 'system-ota-out',
      userName: 'Channel Manager Outbound',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging ota action:', error);
  }
};

export const pushAvailability = async (startDateStr: string, endDateStr: string) => {
  try {
    const config = await ChannelConfig.findById('default');
    if (!config || !config.isActive) return;

    const avails = await calculateAvailability(startDateStr, endDateStr);

    if (avails.length === 0) return;

    // Call CM provider endpoint (mocking endpoint for this community edition CRM phase)
    // await makeChannelApiCall(config, '/v1/inventory/update', 'POST', { propertyId: config.propertyId, inventory: avails });
    console.log(`[Channel Mock Push] Pushing ${avails.length} daily availability records to ${config.provider}`);
    await logSyncAction('Push Availability', `Synced ${startDateStr} to ${endDateStr} to ${config.provider}`);

  } catch (err: any) {
    console.error('Failed to push availability to channel:', err.message);
  }
};

export const confirmChannelReservation = async (channelBookingId: string, crmBookingId: string) => {
  try {
    const config = await ChannelConfig.findById('default');
    if (!config || !config.isActive) return;

    // await makeChannelApiCall(config, `/v1/reservations/${channelBookingId}/confirm`, 'POST', { crmBookingId });
    console.log(`[Channel Mock Push] Confirming booking ${channelBookingId}`);
    await logSyncAction('Confirm Reservation', `Confirmed OTA booking ${channelBookingId} with CM`);
  } catch (err: any) {
    console.error('Failed to confirm channel reservation:', err.message);
  }
};

export const rejectChannelReservation = async (channelBookingId: string) => {
  try {
    const config = await ChannelConfig.findById('default');
    if (!config || !config.isActive) return;

    // await makeChannelApiCall(config, `/v1/reservations/${channelBookingId}/reject`, 'POST', {});
    console.log(`[Channel Mock Push] Rejecting booking ${channelBookingId}`);
    await logSyncAction('Reject Reservation', `Rejected OTA booking ${channelBookingId} with CM`);
  } catch (err: any) {
    console.error('Failed to reject channel reservation:', err.message);
  }
};
