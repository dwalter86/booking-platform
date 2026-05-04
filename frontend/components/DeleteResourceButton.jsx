'use client';

import { useRef } from 'react';

export default function DeleteResourceButton({ resourceId }) {
  const formRef = useRef(null);

  function handleClick(e) {
    e.preventDefault();
    const confirmed = confirm(
      'Are you sure you want to delete this resource?\n\nIf it has existing bookings it will be archived — confirmed and cancelled bookings are preserved, provisional bookings will be cancelled.\n\nThis cannot be undone.'
    );
    if (confirmed) {
      formRef.current.submit();
    }
  }

  return (
    <form
      ref={formRef}
      action="/resource-actions/delete"
      method="post"
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="id" value={resourceId} />
      <button
        className="btn btn-outline-danger"
        type="button"
        onClick={handleClick}
      >
        Delete resource
      </button>
    </form>
  );
}
