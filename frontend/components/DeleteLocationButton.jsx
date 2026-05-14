'use client';

import { useRef } from 'react';

export default function DeleteLocationButton({ locationId }) {
  const formRef = useRef(null);

  function handleClick(e) {
    e.preventDefault();
    const confirmed = confirm('Delete this location?\n\nThis cannot be undone.');
    if (confirmed) {
      formRef.current.submit();
    }
  }

  return (
    <form
      ref={formRef}
      action="/location-actions/delete"
      method="post"
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="location_id" value={locationId} />
      <button
        className="btn btn-outline-danger btn-sm"
        type="button"
        onClick={handleClick}
      >
        Delete
      </button>
    </form>
  );
}
