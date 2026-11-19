export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="page page--bare" style={{ minHeight: "100dvh", justifyContent: "center", textAlign: "center", alignItems: "center" }}>
      <div className="hero-mark" style={{ width: 56, height: 56, borderRadius: 16 }}><i style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--burst)" }} /></div>
      <h1 className="title-2">You&apos;re offline</h1>
      <p className="callout">Votepaddie needs a connection for this page. Result sheets you already scanned are safe on your phone and will upload when you&apos;re back online.</p>
      <a className="btn btn-secondary" href="/">Try again</a>
    </main>
  );
}
