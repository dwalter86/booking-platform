'use client';

export default function AvailabilityExceptionsList({ exceptions, resourceId, returnBase }) {
  if (!Array.isArray(exceptions) || !exceptions.length) {
    return <p className="text-secondary mb-0">No exceptions set. Add one below for bank holidays or special closures.</p>;
  }

  return (
    <div className="d-flex flex-column gap-3">
      {exceptions.map((ex) => (
        <div className="card" key={ex.id}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="card-title mb-1">{ex.exception_date}</h4>
                <div className="text-secondary small">
                  {ex.is_closed ? (
                    <span className="text-danger">Closed all day</span>
                  ) : (
                    <span>
                      Open {ex.start_time?.slice(0, 5)} – {ex.end_time?.slice(0, 5)}
                    </span>
                  )}
                  {ex.note ? ` · ${ex.note}` : ''}
                </div>
              </div>
              <form action="/availability-exception-actions/delete" method="post">
                <input type="hidden" name="id" value={ex.id} />
                <input type="hidden" name="resource_id" value={resourceId} />
                {returnBase && <input type="hidden" name="return_base" value={returnBase} />}
                <button className="btn btn-outline-danger btn-sm" type="submit">Delete</button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
