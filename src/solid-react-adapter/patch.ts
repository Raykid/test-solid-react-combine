import { ComponentType } from "react";
import {
  createSignal as _createSignal,
  Setter,
  Signal,
  SignalOptions,
} from "solid-js";

export const microDelay = Promise.resolve();
export const solidPatchDeps = Symbol("solid patch deps");
Object.defineProperty(Symbol, "solidPatchDeps", {
  configurable: true,
  enumerable: false,
  writable: false,
  value: solidPatchDeps,
});

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
  Object.defineProperty(wrappedSignal, solidPatchDeps, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: [],
  });

  return [
    wrappedSignal,
    ((value) => {
      if (!dirty) {
        microDelay.then(() => {
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

export function wrapSolidComp(tag: any) {
  if (typeof tag === "function") {
    return tag;
  } else {
    return (props: any) => {
      const element = document.createElement(tag + "");
      const handleChild = (child: any) => {
        switch (typeof child) {
          case "function":
            child = child();
            break;
          case "string":
            child = document.createTextNode(child + "");
            break;
          default:
            break;
        }
        if (child instanceof Node) {
          element.appendChild(child);
        }
      };
      Object.keys(props).forEach((key) => {
        if (key === "children") {
          const children = props.children;
          if (Array.isArray(children)) {
            children.forEach(handleChild);
          } else {
            handleChild(children);
          }
        } else {
          element.setAttribute(key, props[key]);
        }
      });
      return element;
    };
  }
}

declare global {
  function __wrapSolidComp__(tag: any): ComponentType<any>;

  interface Window {
    __wrapSolidComp__(tag: any): ComponentType<any>;
  }
}

export function enablePatch() {
  Object.defineProperty(window, "__wrapSolidComp__", {
    configurable: true,
    enumerable: false,
    writable: false,
    value: wrapSolidComp,
  });
}
