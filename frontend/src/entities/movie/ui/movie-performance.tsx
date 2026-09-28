import type { MoviePerformance } from '../model/movie.schema';

type MoviePerformanceProps = {
  performance: MoviePerformance | null;
};

const formatCurrency = (value: string | null, currency: 'USD' | 'BRL'): string => {
  if (value === null) return '—';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';

  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
};

const formatVotes = (value: number | null): string => {
  if (value === null) return '—';
  return new Intl.NumberFormat('pt-BR').format(value);
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="performance-metric">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

export const MoviePerformanceDetails = ({ performance }: MoviePerformanceProps) => {
  if (performance === null) {
    return (
      <section className="performance-section" aria-labelledby="performance-title">
        <div className="performance-section-head">
          <h2 id="performance-title">Desempenho do filme</h2>
          <p>Dados financeiros e de audiência</p>
        </div>
        <p className="performance-empty">Ainda não há dados de desempenho para este filme.</p>
      </section>
    );
  }

  return (
    <section className="performance-section" aria-labelledby="performance-title">
      <div className="performance-section-head">
        <h2 id="performance-title">Desempenho do filme</h2>
        <p>Dados financeiros e de audiência</p>
      </div>

      <div className="performance-group">
        <small>FINANCEIRO</small>
        <dl className="performance-grid">
          <Metric
            label="Orçamento · USD"
            value={formatCurrency(performance.orcamento_usd, 'USD')}
          />
          <Metric label="Receita · USD" value={formatCurrency(performance.receita_usd, 'USD')} />
          <Metric label="Lucro · USD" value={formatCurrency(performance.lucro_usd, 'USD')} />
          <Metric
            label="Orçamento · BRL"
            value={formatCurrency(performance.orcamento_brl, 'BRL')}
          />
          <Metric label="Receita · BRL" value={formatCurrency(performance.receita_brl, 'BRL')} />
          <Metric label="Lucro · BRL" value={formatCurrency(performance.lucro_brl, 'BRL')} />
        </dl>
      </div>

      <div className="performance-group">
        <small>AUDIÊNCIA</small>
        <dl className="performance-grid">
          <Metric label="Popularidade" value={formatNumber(performance.popularidade)} />
          <Metric label="Nota TMDB" value={formatNumber(performance.nota_tmdb)} />
          <Metric label="Votos TMDB" value={formatVotes(performance.qtd_tmdb)} />
          <Metric label="Nota IMDb" value={formatNumber(performance.nota_imdb)} />
          <Metric label="Votos IMDb" value={formatVotes(performance.qtd_imdb)} />
        </dl>
      </div>
    </section>
  );
};
