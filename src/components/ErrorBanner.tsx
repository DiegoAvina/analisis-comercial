
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner">
      <span>⚠️</span>
      <span>{message}</span>
    </div>
  );
}
