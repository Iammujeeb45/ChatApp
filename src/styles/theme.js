import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const colors = {
  pulse: {
    // Soothing Night Mode (Eye-friendly for night use)
    darkAppBg: "#0b0f19",
    darkHeaderBg: "#1e293b",
    darkChatBg: "#0f172a",
    darkInputBg: "#1e293b",
    darkBorder: "rgba(255, 255, 255, 0.08)",
    darkIncoming: "#1e293b",
    darkOutgoingGrad: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    darkAccent: "#3b82f6",
    darkAccentCyan: "#38bdf8",
    darkText: "#f8fafc",
    darkSubtext: "#94a3b8",

    // Soft Warm Light Mode (Gentle on eyes, colorblind accessible WCAG AA)
    lightAppBg: "#e5e9f0",
    lightHeaderBg: "#f8fafc",
    lightChatBg: "#f1f5f9",
    lightInputBg: "#ffffff",
    lightBorder: "#cbd5e1",
    lightIncoming: "#ffffff",
    lightOutgoingGrad: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
    lightAccent: "#2563eb",
    lightAccentCyan: "#0284c7",
    lightText: "#0f172a",
    lightSubtext: "#64748b",
  },
};

const styles = {
  global: (props) => ({
    body: {
      bg: props.colorMode === "dark" ? "#0b0f19" : "#e5e9f0",
      color: props.colorMode === "dark" ? "#f8fafc" : "#0f172a",
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflow: "hidden",
    },
  }),
};

const theme = extendTheme({ config, colors, styles });

export default theme;
