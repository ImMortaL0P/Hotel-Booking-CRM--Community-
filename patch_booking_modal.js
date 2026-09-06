import fs from 'fs';

let content = fs.readFileSync('src/app/components/NewBookingModal.tsx', 'utf-8');

const validationCode = `    // Validation: Double-booking check
    const isConflict = useData().bookings.some(b => {
      if (b.roomId !== selectedRoomId) return false;
      if (b.status === 'Checked-Out' || b.status === 'Cancelled') return false;
      const start1 = new Date(checkInDate).getTime();
      const end1 = new Date(checkOutDate).getTime();
      const start2 = new Date(b.checkIn).getTime();
      const end2 = new Date(b.checkOut).getTime();
      return start1 < end2 && end1 > start2;
    });
    if (isConflict) {
      toast.error('Room is already booked for these dates.');
      return;
    }`;

// Oh wait, useData().bookings is not available directly, but we have `bookings` in the component scope?
// Let's verify if `bookings` is imported from useData.
