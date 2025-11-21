import { createRoot } from "react-dom/client";
import AppRoot from "./App";

const rootContainer = document.getElementById("root");

if (rootContainer) {
  if (!rootContainer.hasChildNodes()) {
    createRoot(rootContainer).render(<AppRoot />);
  } else {
    const root = createRoot(rootContainer);
    root.render(<AppRoot />);
  }
}

