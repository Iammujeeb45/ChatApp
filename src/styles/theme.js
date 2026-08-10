import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const colors = {
  pulse: {
    // Softer Night Mode for long chat sessions
    darkAppBg: "#0a1020",
    darkHeaderBg: "#111827",
    darkChatBg: "#0d1324",
    darkInputBg: "#121a2f",
    darkBorder: "rgba(148, 163, 184, 0.16)",
    darkIncoming: "#121a2f",
    darkOutgoingGrad: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
    darkAccent: "#3b82f6",
    darkAccentCyan: "#38bdf8",
    darkText: "#eef2ff",
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
    html: {
      height: "100%",
      overflow: "hidden",
    },
    body: {
      minHeight: "100%",
      bg: props.colorMode === "dark" ? "#0a1020" : "#e5e9f0",
      backgroundImage:
        props.colorMode === "dark"
          ? "radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 42%), radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.08), transparent 35%)"
          : "none",
      backgroundAttachment: "fixed",
      color: props.colorMode === "dark" ? "#eef2ff" : "#0f172a",
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      overflow: "hidden",
      overscrollBehavior: "none",
      WebkitTapHighlightColor: "transparent",
    },
    "#root": {
      height: "100%",
      overflow: "hidden",
    },
  }),
};

const theme = extendTheme({ config, colors, styles });

export default theme;
