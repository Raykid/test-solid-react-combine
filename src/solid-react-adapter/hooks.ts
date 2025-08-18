import {
  createContext as _createContext,
  useContext as _useContext,
  Context,
  createEffect,
  createRenderEffect,
  FlowComponent,
  JSX,
} from "solid-js";
import { createSignal, microDelay, solidPatchDeps } from "./patch";

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

const symbolValidate = Symbol("validate");
Object.defineProperty(Symbol, "symbolValidate", {
  configurable: true,
  enumerable: false,
  writable: false,
  value: symbolValidate,
});

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
          case solidPatchDeps:
            return (signal as any as { [solidPatchDeps]: DependencyList })[
              solidPatchDeps
            ];
          default:
            return Reflect.get(value!, key);
        }
      },
    }),
    setSignal,
  ];
}

function trackDeps(deps: DependencyList) {
  if (deps.length > 0) {
    // 去重
    const depMap: Map<unknown, boolean> = new Map();
    deps.forEach((dep) => {
      if (typeof dep === "function" && solidPatchDeps in (dep as any)) {
        if (!depMap.has(dep)) {
          depMap.set(dep, true);
          dep(symbolValidate);
          // 还要间接追踪依赖
          trackDeps((dep as any)[solidPatchDeps]);
        }
      }
    });
    depMap.clear();
  }
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
  function factory() {
    return function (this: any, ...args: any[]) {
      return callback.apply(this, args);
    } as any as T;
  }
  let cache: T;
  // 使用立即执行的 createRenderEffect 负责更新值
  createRenderEffect(() => {
    trackDeps(deps);
    cache = factory();
  });
  // memo 函数里面只监听 deps 变化返回新的值，避免不必要的重新计算
  return new Proxy(cache!, {
    get(_, key) {
      switch (key) {
        case solidPatchDeps:
          return deps;
        default:
          return Reflect.get(cache, key);
      }
    },
    apply(_, thisArg, args) {
      return args.length === 1 && args[0] === symbolValidate
        ? cache
        : cache.apply(thisArg, args);
    },
    has(_, key) {
      switch (key) {
        case solidPatchDeps:
          return true;
        default:
          return key in cache;
      }
    },
  });
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
  Object.defineProperty(memo, solidPatchDeps, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: deps,
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
  createEffect(() => {
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
  createEffect(() => {
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
  createEffect(() => {
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

/**
 * Created by {@link createRef}, or {@link useRef} when passed `null`.
 *
 * @template T The type of the ref's value.
 *
 * @example
 *
 * ```tsx
 * const ref = createRef<HTMLDivElement>();
 *
 * ref.current = document.createElement('div'); // Error
 * ```
 */
export type RefObject<T> = {
  (el: T): void;
  /**
   * The current value of the ref.
   */
  current: T;
};

/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useRef}
 */
export function useRef<T>(initialValue: T): RefObject<T>;
// convenience overload for refs given as a ref prop as they typically start with a null value
/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useRef}
 */
export function useRef<T>(initialValue: T | null): RefObject<T | undefined>;
// convenience overload for undefined initialValue
/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useRef}
 */
export function useRef<T>(
  initialValue: T | undefined
): RefObject<T | undefined>;
export function useRef<T, Init = T | null | undefined>(
  initialValue: Init
): RefObject<Exclude<Init, null>> {
  // 返回一个函数，只用 ref 的函数模式
  const ref = ((v: Exclude<Init, null>) => {
    ref.current = v;
  }) as RefObject<Exclude<Init, null>>;
  ref.current = (initialValue === null ? undefined : initialValue) as Exclude<
    Init,
    null
  >;
  return ref;
}

/**
 * Lets you create a {@link Context} that components can provide or read.
 *
 * @param defaultValue The value you want the context to have when there is no matching
 * {@link Provider} in the tree above the component reading the context. This is meant
 * as a "last resort" fallback.
 *
 * @see {@link https://react.dev/reference/react/createContext#reference React Docs}
 * @see {@link https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/context/ React TypeScript Cheatsheet}
 *
 * @example
 *
 * ```tsx
 * import { createContext } from 'react';
 *
 * const ThemeContext = createContext('light');
 * function App() {
 *   return (
 *     <ThemeContext value="dark">
 *       <Toolbar />
 *     </ThemeContext>
 *   );
 * }
 * ```
 */
export function createContext<T>(
  // If you thought this should be optional, see
  // https://github.com/DefinitelyTyped/DefinitelyTyped/pull/24509#issuecomment-382213106
  defaultValue: T
): Context<T> & {
  Consumer: FlowComponent<{}, (value: T) => JSX.Element>;
  displayName?: string | undefined;
} {
  const context = _createContext(defaultValue);
  return {
    ...context,
    Consumer: (props) => {
      const value = useContext(context);
      return props.children(value);
    },
    displayName: undefined as string | undefined,
  };
}

/**
 * Accepts a context object (the value returned from `React.createContext`) and returns the current
 * context value, as given by the nearest context provider for the given context.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useContext}
 */
export function useContext<T>(context: Context<T>): T {
  return _useContext(context);
}

// Limit the reducer to accept only 0 or 1 action arguments
// eslint-disable-next-line @definitelytyped/no-single-element-tuple-type
export type AnyActionArg = [] | [any];

// Get the dispatch type from the reducer arguments (captures optional action argument correctly)
export type ActionDispatch<ActionArg extends AnyActionArg> = (
  ...args: ActionArg
) => void;

/**
 * An alternative to `useState`.
 *
 * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
 * multiple sub-values. It also lets you optimize performance for components that trigger deep
 * updates because you can pass `dispatch` down instead of callbacks.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useReducer}
 */
export function useReducer<S, A extends AnyActionArg>(
  reducer: (prevState: S, ...args: A) => S,
  initialState: S
): [S, ActionDispatch<A>];
/**
 * An alternative to `useState`.
 *
 * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
 * multiple sub-values. It also lets you optimize performance for components that trigger deep
 * updates because you can pass `dispatch` down instead of callbacks.
 *
 * @version 16.8.0
 * @see {@link https://react.dev/reference/react/useReducer}
 */
export function useReducer<S, I, A extends AnyActionArg>(
  reducer: (prevState: S, ...args: A) => S,
  initialArg: I,
  init: (i: I) => S
): [S, ActionDispatch<A>];
export function useReducer<S, I, A extends AnyActionArg>(
  reducer: (prevState: S, ...args: A) => S,
  initialState: I | S,
  init?: (i: I) => S
): [S, ActionDispatch<A>] {
  if (init) {
    initialState = init(initialState as I);
  }
  const [state, setState] = useState(initialState as S);
  return [
    state,
    (...args: A) => {
      const newState = reducer(state, ...args);
      setState(newState as Exclude<S, Function>);
    },
  ];
}
