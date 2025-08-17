import {
  createSignal as _createSignal,
  Setter,
  Signal,
  SignalOptions,
} from "solid-js";

export const symbolSignal = Symbol("solid patch signal");

export function createSignal<T>(): Signal<T | undefined>;
export function createSignal<T>(
  value: T,
  options?: SignalOptions<T>
): Signal<T>;
export function createSignal<T>(value?: T, options?: SignalOptions<T>) {
  const [signal, setSignal] =
    value === undefined ? _createSignal<T>() : _createSignal(value, options);

  let dirty = false;
  let cache: T | undefined;

  const wrappedSignal = () => {
    const value = signal();
    return dirty ? cache : value;
  };
  Object.defineProperty(wrappedSignal, symbolSignal, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: symbolSignal,
  });

  return [
    wrappedSignal,
    ((value) => {
      if (!dirty) {
        Promise.resolve().then(() => {
          (setSignal as any)(cache);
          dirty = false;
        });
        dirty = true;
        cache = signal();
      }
      cache = typeof value === "function" ? (value as any)(cache) : value;
      return cache;
    }) as Setter<T>,
  ];
}
