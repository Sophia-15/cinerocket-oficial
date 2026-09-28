export const ErrorBanner = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="error-banner" role="alert">
    <p>{message}</p>
    {onRetry ? (
      <button type="button" className="button ghost" onClick={onRetry}>
        Tentar novamente
      </button>
    ) : null}
  </div>
);
