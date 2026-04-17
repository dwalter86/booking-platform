export default function DataCard({ title, children, footer, headerStyle }) {
  return (
    <div className="card mb-4">
      <div className="card-header" style={headerStyle}><h3 className="card-title mb-0" style={headerStyle ? { color: headerStyle.color } : {}}>{title}</h3></div>
      <div className="card-body">{children}</div>
      {footer ? <div className="card-footer">{footer}</div> : null}
    </div>
  );
}
