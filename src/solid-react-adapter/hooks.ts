import { createEffect, createMemo } from "solid-js";
import { createSignal, symbolSignal } from "./patch";

/**
 * The instruction passed to a {@link Dispatch} function in {@link useState}
 * to tell React what the next value of the {@link useState} should be.
 *
 * Often found wrapped in {@link Dispatch}.
 *
 * @template S The type of the state.
 *
 * @example
 *
 * ```tsx
 * // This return type correctly represents the type of
 * // `setCount` in the example below.
 * const useCustomState = (): Dispatch<SetStateAction<number>> => {
 *   const [count, setCount] = useState(0);
 *
 *   return setCount;
 * }
 * ```
 */
export type SetStateAction<S> = S | ((prevState: S) => S);

/**
 * A function that can be used to update the state of a {@link useState}
 * or {@link useReducer} hook.
 */
export type Dispatch<A> = (value: A) => void;

export type DependencyList = readonly unknown[];

/**
 * The function returned from an effect passed to {@link React.useEffect useEffect},
 * which can be used to clean up the effect when the component unmounts.
 *
 * @see {@link https://react.dev/reference/react/useEffect React Docs}
 */
export type Destructor = () => void;

// NOTE: callbacks are _only_ allowed to return either void, or a destructor.
export type EffectCallback = () => void | Destructor;

export function useState<S>(
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>];
export function useState<S = undefined>(): [
  S | undefined,
  Dispatch<SetStateAction<S | undefined>>,
];
export function useState<S>(state?: S | (() => S)) {
  if (typeof state === "function") {
    state = (state as () => S)();
  }
  const [signal, setSignal] = createSignal(state);
  return [
    new Proxy(signal, {
      get(_, key) {
        const value = signal();
        switch (key) {
          case Symbol.toPrimitive:
          case "toJSON":
            return signal;
          default:
            return Reflect.get(value!, key);
        }
      },
    }),
    setSignal,
  ];
}

function trackDeps(deps: DependencyList) {
  deps.forEach((dep) => {
    // Track dependencies
    if (typeof dep === "function" && symbolSignal in (dep as any)) {
      dep();
    }
  });
}

/**
 * `useCallback` will return a memoized version of the callback that only changes if one of the `inputs`
 * has changed.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useCallback}
 */
// A specific function type would not trigger implicit any.
// See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/52873#issuecomment-845806435 for a comparison between `Function` and more specific types.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function useCallback<T extends Function>(
  callback: T,
  deps: DependencyList
): T {
  trackDeps(deps);
  return callback;
}

/**
 * `useMemo` will only recompute the memoized value when one of the `deps` has changed.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useMemo}
 */
// allow undefined, but don't make it optional as that is very likely a mistake
export function useMemo<T>(factory: () => T, deps: DependencyList): T {
  return createMemo(() => {
    trackDeps(deps);
    return factory();
  }) as T;
}

/**
 * Accepts a function that contains imperative, possibly effectful code.
 *
 * @param effect Imperative function that can return a cleanup function
 * @param deps If present, effect will only activate if the values in the list change.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useEffect}
 */
export function useEffect(effect: EffectCallback, deps?: DependencyList): void {
  createEffect<void | Destructor>((cleanup) => {
    if (cleanup) {
      cleanup();
    }
    if (deps) {
      trackDeps(deps);
    }
    return effect();
  });
}
