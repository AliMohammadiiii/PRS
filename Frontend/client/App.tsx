import "./global.css";

import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "../routes/routeTree.gen";
import Providers from "../providers";

// Create a new router instance
// Use /PRS as base path in production
const basepath = import.meta.env.PROD ? '/PRS' : '/';

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
