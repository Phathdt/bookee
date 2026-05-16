import { useGetHealth, type HealthResponseDto } from '@bookee/api-client';

export function LandingPage() {
  const { data, isLoading, error } = useGetHealth<HealthResponseDto>();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Operator CMS</h1>
      <p>Bookee — multi-operator trip booking platform.</p>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: '#444' }}>Backend status</h2>
        {isLoading && <p>Checking…</p>}
        {error != null && <p style={{ color: 'crimson' }}>API unreachable</p>}
        {data && <p style={{ color: 'green' }}>status: {data.status}</p>}
      </section>
    </main>
  );
}
