export default function DataCard({ title, children, footer, headerStyle, headerAction }) {
  return (
    <div className="card mb-4">
      <div className="card-header" style={headerStyle}>
        <h3 className="card-title mb-0" style={headerStyle ? { color: headerStyle.color } : {}}>
          {title}
        </h3>
        {headerAction && (
          <div className="card-options">
            {headerAction}
          </div>
        )}
      </div>
      <div className="card-body">{children}</div>
      {footer ? <div className="card-footer">{footer}</div> : null}
    </div>
  );
}
