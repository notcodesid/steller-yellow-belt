import type { AppError } from "../lib/errors";

interface Props {
  error: AppError | null;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: Props) {
  if (!error) return null;
  return (
    <div className="error-banner" role="alert">
      <span className="tag">{error.type}</span>
      <div className="msg">
        <strong>{error.title}</strong>
        {error.message}
      </div>
      <button className="close" onClick={onDismiss} aria-label="Dismiss error">
        ×
      </button>
    </div>
  );
}
