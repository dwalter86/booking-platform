'use client';

import { useState } from 'react';
import ActivityTable from './ActivityTable';
import BookingPanel from './booking-panel/BookingPanel';

export default function DashboardActivityPanel({ initialBookings = [], totalCount = 0 }) {
  const [openBookingId, setOpenBookingId] = useState(null);
  const [mode, setMode] = useState('view');

  const handleClose = () => {
    setOpenBookingId(null);
    setMode('view');
  };

  return (
    <>
      <ActivityTable
        initialBookings={initialBookings}
        totalCount={totalCount}
        onView={(id) => { setOpenBookingId(id); setMode('view'); }}
      />

      {openBookingId && (
        <BookingPanel
          bookingId={openBookingId}
          mode={mode}
          onModeChange={setMode}
          onClose={handleClose}
        />
      )}
    </>
  );
}
