import { ThemeProvider } from "next-themes";
import { useLocation } from "react-router-dom";

const appPaths = /^\/(inicio|clientes|productos|pedidos|pedido|cobros|entregas|mensajes|reporte|promocionar)(\/|$)/;

export default function AppTheme({ children }) {
  const { pathname } = useLocation();
  return (
    <ThemeProvider
      attribute="class"
      storageKey="nenis-pro-appearance"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme={appPaths.test(pathname) ? undefined : "light"}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
