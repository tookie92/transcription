"use client";

export function DebugPanel() {
  console.log("🧪 DebugPanel render");
  return (
    <div
      style={{
        position: "fixed",
        top: 100,
        left: 100,
        width: 200,
        height: 100,
        backgroundColor: "red",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        fontWeight: "bold",
        zIndex: 9999,
      }}
    >
      PANEL
    </div>
  );
}