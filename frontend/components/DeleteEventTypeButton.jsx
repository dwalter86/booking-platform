'use client';

import { useRef } from 'react';

export default function DeleteEventTypeButton({ eventTypeId, resourceId }) {
  const formRef = useRef(null);

  function handleClick(e) {
    e.preventDefault();
    const confirmed = confirm(
      'Delete this event type?\n\nIf it has existing bookings it will be deactivated rather than deleted.\n\nThis cannot be undone.'
    );
    if (confirmed) {
      formRef.current.submit();
    }
  }

  return (
    <form
      ref={formRef}
      action="/event-type-actions/delete"
      method="post"
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="id" value={eventTypeId} />
      <input type="hidden" name="resource_id" value={resourceId} />
      <button
        className="btn btn-sm btn-outline-danger"
        type="button"
        onClick={handleClick}
      >
        Delete
      </button>
    </form>
  );
}
