'use client';

import { useState, useEffect } from 'react';

export default function CalendarViewButtons({ initialView = 'timeGridWeek' }) {
  const [activeView, setActiveView] = useState(initialView);

  useEffect(() => {
    const handler = (e) => setActiveView(e.detail);
    window.addEventListener('calendarViewChange', handler);
    return () => window.removeEventListener('calendarViewChange', handler);
  }, []);

  return (
    <div className="btn-group">
      <a href="/calendar?view=timeGridDay" className={`btn btn-sm ${activeView === 'timeGridDay' ? 'btn-primary' : 'btn-outline-secondary'}`}>Day</a>
      <a href="/calendar?view=timeGridWeek" className={`btn btn-sm ${activeView === 'timeGridWeek' ? 'btn-primary' : 'btn-outline-secondary'}`}>Week</a>
      <a href="/calendar?view=dayGridMonth" className={`btn btn-sm ${activeView === 'dayGridMonth' ? 'btn-primary' : 'btn-outline-secondary'}`}>Month</a>
    </div>
  );
}
