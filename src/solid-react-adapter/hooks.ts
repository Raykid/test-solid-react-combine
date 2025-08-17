import { createRenderEffect } from "solid-js";
import { createSignal, microDelay, solidPatchSignal } from "./patch";

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
          case solidPatchSignal:
            return solidPatchSignal;
          default:
            return Reflect.get(value!, key);
        }
      },
    }),
    setSignal,
  ];
}

function trackDeps(deps: DependencyList) {
  // 去重
  const depMap: Map<unknown, boolean> = new Map();
  deps.forEach((dep) => {
    if (typeof dep === "function" && solidPatchSignal in (dep as any)) {
      if (!depMap.has(dep)) {
        depMap.set(dep, true);
        dep();
      }
    }
  });
  depMap.clear();
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
  let cache: T;
  // 使用立即执行的 createRenderEffect 负责更新值
  createRenderEffect(() => {
    cache = factory();
  });
  // memo 函数里面只监听 deps 变化返回新的值，避免不必要的重新计算
  const memo = (() => {
    trackDeps(deps);
    return cache;
  }) as T;
  Object.defineProperty(memo, solidPatchSignal, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: solidPatchSignal,
  });
  return memo;
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
  let cleanup: Destructor | void;
  createRenderEffect(() => {
    if (deps) {
      trackDeps(deps);
    }
    // 使用微任务延时调用 effect，一方面避免自动收集依赖，另一方面也是模仿了 useEffect 的实际行为
    // useEffect 在三个 Effect 系列中是最后触发的，所以要延时3次
    microDelay.then(() => {
      microDelay.then(() => {
        microDelay.then(() => {
          if (cleanup) {
            cleanup();
          }
          cleanup = effect();
        });
      });
    });
  });
}

/**
 * The signature is identical to `useEffect`, but it fires synchronously after all DOM mutations.
 * Use this to read layout from the DOM and synchronously re-render. Updates scheduled inside
 * `useLayoutEffect` will be flushed synchronously, before the browser has a chance to paint.
 *
 * Prefer the standard `useEffect` when possible to avoid blocking visual updates.
 *
 * If you’re migrating code from a class component, `useLayoutEffect` fires in the same phase as
 * `componentDidMount` and `componentDidUpdate`.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useLayoutEffect}
 */
export function useLayoutEffect(
  effect: EffectCallback,
  deps?: DependencyList
): void {
  let cleanup: Destructor | void;
  createRenderEffect(() => {
    if (deps) {
      trackDeps(deps);
    }
    // 使用微任务延时调用 effect，一方面避免自动收集依赖，另一方面也是模仿了 useEffect 的实际行为
    // useLayoutEffect 在三个 Effect 系列中第二触发，所以要延时2次
    microDelay.then(() => {
      microDelay.then(() => {
        if (cleanup) {
          cleanup();
        }
        cleanup = effect();
      });
    });
  });
}

/**
 * @param effect Imperative function that can return a cleanup function
 * @param deps If present, effect will only activate if the values in the list change.
 *
 * @see {@link https://github.com/facebook/react/pull/21913}
 */
export function useInsertionEffect(
  effect: EffectCallback,
  deps?: DependencyList
): void {
  let cleanup: Destructor | void;
  createRenderEffect(() => {
    if (deps) {
      trackDeps(deps);
    }
    // 使用微任务延时调用 effect，一方面避免自动收集依赖，另一方面也是模仿了 useEffect 的实际行为
    microDelay.then(() => {
      if (cleanup) {
        cleanup();
      }
      cleanup = effect();
    });
  });
}
