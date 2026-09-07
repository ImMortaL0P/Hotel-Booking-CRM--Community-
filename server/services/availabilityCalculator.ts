import { Room } from '../models/Room.js';
import { Booking } from '../models/Booking.js';
import { ChannelConfig } from '../models/ChannelConfig.js';

export interface RoomAvailability {
  date: string; // YYYY-MM-DD
  channelRoomTypeCode: string;
  availableCount: number;
}

export const calculateAvailability = async (
  startDateStr: string,
  endDateStr: string
): Promise<RoomAvailability[]> => {
  const config = await ChannelConfig.findById('default');
  if (!config || !config.isActive || !config.roomTypeMappings || config.roomTypeMappings.length === 0) {
    return []; // Nothing to sync
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const allRooms = await Room.find();

  // Aggregate total counts per category
  const categoryTotalCounts: Record<string, number> = {};
  allRooms.forEach(room => {
    // Only count available or expectedly assignable rooms (exclude permanent maintenance maybe, but usually in a CRM we sync physical max minus bookings)
    // Assuming 'Maintenance' status is short term, we could either count them and block by a fake booking, or just count all physics.
    categoryTotalCounts[room.category] = (categoryTotalCounts[room.category] || 0) + 1;
  });

  // Get active bookings in this range
  // Using CheckIn < EndDate AND CheckOut > StartDate to find overlapping
  const overlappingBookings = await Booking.find({
    status: { $in: ['Booked', 'Confirmed', 'Checked-In'] },
    checkIn: { $lte: endDateStr },
    checkOut: { $gte: startDateStr }
  });

  const results: RoomAvailability[] = [];

  // For every day in the range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Group active bookings on this specific day by room category
    const dailyUsedMap: Record<string, number> = {};

    overlappingBookings.forEach(b => {
      // If the booking spans this day.
      // CheckOut day doesn't consume the room for the night.
      if (b.checkIn <= dayStr && b.checkOut > dayStr) {
        // Find the room category for this booking (need to look up from room list)
        const room = allRooms.find(r => r._id === b.roomId);
        if (room) {
          dailyUsedMap[room.category] = (dailyUsedMap[room.category] || 0) + 1;
        }
      }
    });

    // For each mapped category, output the available count
    for (const mapping of config.roomTypeMappings) {
      if (mapping.channelRoomTypeCode) {
        const total = categoryTotalCounts[mapping.crmCategory] || 0;
        const used = dailyUsedMap[mapping.crmCategory] || 0;

        results.push({
          date: dayStr,
          channelRoomTypeCode: mapping.channelRoomTypeCode,
          availableCount: Math.max(0, total - used)
        });
      }
    }
  }

  return results;
};
