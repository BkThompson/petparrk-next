"use client";

import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {/* Toast container — fixed bottom center, always visible */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toast.type === "error" ? "#c62828" : "#2d6a4f",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "600",
              fontFamily: "system-ui, sans-serif",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              whiteSpace: "nowrap",
              animation: "fadeInUp 0.2s ease",
            }}
          >
            {toast.type === "success" ? "✅ " : "❌ "}
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
