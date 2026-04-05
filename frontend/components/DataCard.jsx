export default function DataCard({ title, children, footer }) {
  return (
    <div className="card mb-4">
      <div className="card-header"><h3 className="card-title mb-0">{title}</h3></div>
      <div className="card-body">{children}</div>
      {footer ? <div className="card-footer">{footer}</div> : null}
    </div>
  );
}
