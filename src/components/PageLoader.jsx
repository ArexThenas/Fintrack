/** Shown while a lazily-loaded page is being fetched. */
export default function PageLoader({ message = 'Loading your financial dashboard...' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
