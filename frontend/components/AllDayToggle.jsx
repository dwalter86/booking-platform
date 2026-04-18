'use client';

import { useState } from 'react';

export default function AllDayToggle({ startId, endId, defaultChecked = false }) {
  const [allDay, setAllDay] = useState(defaultChecked);

  function handleChange(e) {
    const checked = e.target.checked;
    setAllDay(checked);
    const start = document.getElementById(startId);
    const end = document.getElementById(endId);
    if (!start || !end) return;
    if (checked) {
      start.value = '00:00';
      end.value = '23:59';
      start.readOnly = true;
      end.readOnly = true;
    } else {
      start.value = '';
      end.value = '';
      start.readOnly = false;
      end.readOnly = false;
    }
  }

  return (
    <>
      <input
        type="checkbox"
        className="btn-check"
        id={`allday_${startId}`}
        checked={allDay}
        onChange={handleChange}
      />
      <label className="btn btn-outline-secondary btn-sm" htmlFor={`allday_${startId}`}>
        All day
      </label>
    </>
  );
}
