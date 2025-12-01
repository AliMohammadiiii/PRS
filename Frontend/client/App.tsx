import "./global.css";

import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "../routes/routeTree.gen";
import Providers from "../providers";

// Create a new router instance
// Base path can be set via PUBLIC_BASE_PATH environment variable
// Defaults to /PRS in production for backward compatibility, or / for root deployment
const getBasePath = (): string => {
  if (import.meta.env.PUBLIC_BASE_PATH) {
    // Remove trailing slash if present
    return import.meta.env.PUBLIC_BASE_PATH.replace(/\/$/, '') || '/';
  }
  return import.meta.env.PROD ? '/PRS' : '/';
};

const basepath = getBasePath();

export const router = createRouter({
  routeTree,
  basepath,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppRoot() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}

export default AppRoot;
