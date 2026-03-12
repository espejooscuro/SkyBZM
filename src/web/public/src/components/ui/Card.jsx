import './Card.css';

export function Card({ children, className = '', hoverable = false, padding = true }) {
  return (
    <div className={`card ${hoverable ? 'card-hoverable' : ''} ${padding ? '' : 'card-no-padding'} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`card-header ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}
