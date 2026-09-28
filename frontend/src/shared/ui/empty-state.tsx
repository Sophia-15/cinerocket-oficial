import type { ReactNode } from 'react';

export const EmptyState = ({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) => (
  <div className="empty">
    {icon}
    <h2>{title}</h2>
    <p>{message}</p>
    {action}
  </div>
);
