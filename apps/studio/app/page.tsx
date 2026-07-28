export default function StudioHomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "0.5rem",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "0 1.5rem",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>Nimia Studio</h1>
      <p style={{ color: "#666", maxWidth: 480 }}>
        Client portal, order system, and project management are being built
        here. This is a placeholder from the Tahap 2 folder scaffold — see
        docs/ARCHITECTURE.md for the full plan.
      </p>
    </main>
  );
}
