import { useGetHealth, type HealthResponseDto } from '@bookee/api-client';

export function LandingPage() {
  const { data, isLoading, error } = useGetHealth<HealthResponseDto>();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Bookee</h1>
      <p>Đặt vé xe khách liên tỉnh nhanh chóng — nhiều nhà xe trên một nền tảng.</p>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', color: '#444' }}>Trạng thái backend</h2>
        {isLoading && <p>Đang kiểm tra…</p>}
        {error != null && <p style={{ color: 'crimson' }}>Không kết nối được API</p>}
        {data && <p style={{ color: 'green' }}>status: {data.status}</p>}
      </section>
    </main>
  );
}
