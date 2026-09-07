import { act, create, type ReactTestRenderer } from "react-test-renderer";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * No `@testing-library/react-native` (or `-hooks`) is installed in this
 * project yet (checked `node_modules/@testing-library` — absent, and
 * `package.json` has no such devDependency). `react-test-renderer` is
 * already a devDependency (used transitively by `jest-expo`), so this
 * tiny harness renders the hook via a throwaway host component instead of
 * adding a new test dependency for a single need. Renders inside a fresh
 * `QueryClientProvider` per call so tests don't share cache state.
 */

interface RenderHookResult<TResult> {
  result: { current: TResult };
  unmount: () => void;
  queryClient: QueryClient;
}

export function renderHookWithClient<TResult>(
  useHookFn: () => TResult,
  queryClient: QueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
): RenderHookResult<TResult> {
  const result = { current: undefined as unknown as TResult };

  function TestComponent() {
    result.current = useHookFn();
    return null;
  }

  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>,
    );
  });

  return {
    result,
    unmount: () => act(() => renderer.unmount()),
    queryClient,
  };
}
