"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "#151b25",
          border: "1px solid rgba(255,255,255,.08)",
          color: "#eef2f8",
          fontSize: "14px",
          minWidth: "260px",
        },
        success: {
          duration: 2600,
          iconTheme: {
            primary: "#1fcb83",
            secondary: "#090b10",
          },
        },
        error: {
          duration: 4200,
          iconTheme: {
            primary: "#f6485d",
            secondary: "#090b10",
          },
        },
        loading: {
          iconTheme: {
            primary: "#4d86ff",
            secondary: "#090b10",
          },
        },
      }}
    />
  );
}
