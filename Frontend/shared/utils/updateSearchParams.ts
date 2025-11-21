// someUtility.ts

import { router } from 'src/client/App';

/**
 * Merge new keys into the current search params
 * (preserving all existing keys you don't touch).
 */
export function updateSearchParams(
  newParams: Record<string, string | number | boolean | undefined>,
) {
  router.navigate({
    // keep the current path
    to: router.state.location.pathname,
    // merge in your new params
    search: (prev) => ({
      ...prev,
      ...newParams,
    }),
  });
}

