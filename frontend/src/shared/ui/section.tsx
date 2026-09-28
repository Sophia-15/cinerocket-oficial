import type { ReactNode } from 'react';

type SectionProps = { title: string; subtitle?: string; action?: ReactNode; children: ReactNode };

export const Section = ({ title, subtitle, action, children }: SectionProps) => (
  <section>
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);
