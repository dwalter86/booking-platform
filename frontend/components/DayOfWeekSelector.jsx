'use client';

import { useState } from 'react';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function DayOfWeekSelector() {
  const [selected, setSelected] = useState([]);

  const allChecked = selected.length === DAYS.length;

  function toggleAll(e) {
    setSelected(e.target.checked ? DAYS.map(d => d.value) : []);
  }

  function toggleDay(value, checked) {
    setSelected(prev =>
      checked ? [...prev, value] : prev.filter(v => v !== value)
    );
  }

  return (
    <div>
      <div className="mb-2">
        <input
          type="checkbox"
          className="btn-check"
          id="dow_all"
          checked={allChecked}
          onChange={toggleAll}
        />
        <label className="btn btn-outline-secondary btn-sm w-100" htmlFor="dow_all">
          Every day
        </label>
      </div>
      <div className="btn-group w-100" role="group">
        {DAYS.map((d) => (
          <>
            <input
              key={`i${d.value}`}
              type="checkbox"
              className="btn-check"
              name="day_of_week"
              value={d.value}
              id={`dow_${d.value}`}
              checked={selected.includes(d.value)}
              onChange={e => toggleDay(d.value, e.target.checked)}
            />
            <label
              key={`l${d.value}`}
              className="btn btn-outline-primary btn-sm"
              htmlFor={`dow_${d.value}`}
            >
              {d.label.slice(0, 3)}
            </label>
          </>
        ))}
      </div>
    </div>
  );
}
