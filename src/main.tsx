
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { DataProvider } from "./app/data/DataContext";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <DataProvider>
      <App />
    </DataProvider>
  );
  