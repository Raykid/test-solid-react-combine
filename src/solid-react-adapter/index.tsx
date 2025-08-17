import type { JSX } from "solid-js/jsx-runtime";
import * as hooks from "./hooks";

export * from "./hooks";

export type FunctionComponent<P = {}> = (props: P) => JSX.Element;
export type FC<P = {}> = FunctionComponent<P>;

export type ComponentType<P = {}> = FunctionComponent<P>;

export function createElement<P = {}>(
  Identifier: string | ComponentType<P>,
  props = {} as P,
  ...children: JSX.Element[]
): JSX.Element {
  return <Identifier {...props}>{children}</Identifier>;
}

export default {
  createElement,
  ...hooks,
};
