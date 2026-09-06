
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { DataProvider } from "./app/data/DataContext";
  import { ThemeProvider } from "./app/components/ThemeProvider";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <ThemeProvider defaultTheme="light" storageKey="hotel-crm-theme">
      <DataProvider>
        <App />
      </DataProvider>
    </ThemeProvider>
  );
  