import { Link } from 'react-router';

export function NotFound() {
  return (
    <main style={{ fontFamily: 'monospace', padding: 16 }}>
      <h1>404</h1>
      <p>not found</p>
      <Link to="/">back to dashboard</Link>
    </main>
  );
}
