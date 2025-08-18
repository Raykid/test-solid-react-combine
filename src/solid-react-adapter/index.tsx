import { Ref } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import * as hooks from "./hooks";
import { RefObject } from "./hooks";

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

export const version = "18.3.1";

/**
 * The type of the ref received by a {@link ForwardRefRenderFunction}.
 *
 * @see {@link ForwardRefRenderFunction}
 */
// Making T nullable is assuming the refs will be managed by React or the component impl will write it somewhere else.
// But this isn't necessarily true. We haven't heard complains about it yet and hopefully `forwardRef` is removed from React before we do.
export type ForwardedRef<T> =
  | ((instance: T | null) => void)
  | RefObject<T | null>
  | null;

/**
 * The type of the function passed to {@link forwardRef}. This is considered different
 * to a normal {@link FunctionComponent} because it receives an additional argument,
 *
 * @param props Props passed to the component, if any.
 * @param ref A ref forwarded to the component of type {@link ForwardedRef}.
 *
 * @template T The type of the forwarded ref.
 * @template P The type of the props the component accepts.
 *
 * @see {@link https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forward_and_create_ref/ React TypeScript Cheatsheet}
 * @see {@link forwardRef}
 */
export interface ForwardRefRenderFunction<T, P = {}> {
  (props: P, ref: ForwardedRef<T>): JSX.Element;
  /**
   * Used in debugging messages. You might want to set it
   * explicitly if you want to display a different name for
   * debugging purposes.
   *
   * Will show `ForwardRef(${Component.displayName || Component.name})`
   * in devtools by default, but can be given its own specific name.
   *
   * @see {@link https://legacy.reactjs.org/docs/react-component.html#displayname Legacy React Docs}
   */
  displayName?: string | undefined;
  /**
   * Ignored by React.
   * @deprecated Only kept in types for backwards compatibility. Will be removed in a future major release.
   */
  propTypes?: any;
}

/**
 * The type of the component returned from {@link forwardRef}.
 *
 * @template P The props the component accepts, if any.
 *
 * @see {@link ExoticComponent}
 */
export interface ForwardRefExoticComponent<P> {
  (props: P): JSX.Element;
  /**
   * Used in debugging messages. You might want to set it
   * explicitly if you want to display a different name for
   * debugging purposes.
   *
   * Will show `ForwardRef(${Component.displayName || Component.name})`
   * in devtools by default, but can be given its own specific name.
   *
   * @see {@link https://legacy.reactjs.org/docs/react-component.html#displayname Legacy React Docs}
   */
  displayName?: string | undefined;
  /**
   * Ignored by React.
   * @deprecated Only kept in types for backwards compatibility. Will be removed in a future major release.
   */
  propTypes?: any;
}

/**
 * Omits the 'ref' attribute from the given props object.
 *
 * @template Props The props object type.
 */
export type PropsWithoutRef<Props> =
  // Omit would not be sufficient for this. We'd like to avoid unnecessary mapping and need a distributive conditional to support unions.
  // see: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
  // https://github.com/Microsoft/TypeScript/issues/28339
  Props extends any
    ? "ref" extends keyof Props
      ? Omit<Props, "ref">
      : Props
    : Props;
/**
 * Ensures that the props do not include string ref, which cannot be forwarded
 * @deprecated Use `Props` directly. `PropsWithRef<Props>` is just an alias for `Props`
 */
export type PropsWithRef<Props> = Props;

export type PropsWithChildren<P = unknown> = P & {
  children?: JSX.Element | undefined;
};

/**
 * A value which uniquely identifies a node among items in an array.
 *
 * @see {@link https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key React Docs}
 */
export type Key = string | number | bigint;

/**
 * Represents a JSX element.
 *
 * Where {@link ReactNode} represents everything that can be rendered, `ReactElement`
 * only represents JSX.
 *
 * @template P The type of the props object
 * @template T The type of the component or tag
 *
 * @example
 *
 * ```tsx
 * const element: ReactElement = <div />;
 * ```
 */
export type ReactElement = JSX.Element;

export type ReactPortal = ReactElement & {
  children: ReactNode;
};

/**
 * @internal Use `Awaited<ReactNode>` instead
 */
// Helper type to enable `Awaited<ReactNode>`.
// Must be a copy of the non-thenables of `ReactNode`.
export type AwaitedReactNode =
  | React.ReactElement
  | string
  | number
  | bigint
  | Iterable<React.ReactNode>
  | React.ReactPortal
  | boolean
  | null
  | undefined
  | React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES[keyof React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES];

/**
 * Represents all of the things React can render.
 *
 * Where {@link ReactElement} only represents JSX, `ReactNode` represents everything that can be rendered.
 *
 * @see {@link https://react-typescript-cheatsheet.netlify.app/docs/react-types/reactnode/ React TypeScript Cheatsheet}
 *
 * @example
 *
 * ```tsx
 * // Typing children
 * type Props = { children: ReactNode }
 *
 * const Component = ({ children }: Props) => <div>{children}</div>
 *
 * <Component>hello</Component>
 * ```
 *
 * @example
 *
 * ```tsx
 * // Typing a custom element
 * type Props = { customElement: ReactNode }
 *
 * const Component = ({ customElement }: Props) => <div>{customElement}</div>
 *
 * <Component customElement={<div>hello</div>} />
 * ```
 */
// non-thenables need to be kept in sync with AwaitedReactNode
export type ReactNode =
  | ReactElement
  | string
  | number
  | bigint
  | Iterable<ReactNode>
  | ReactPortal
  | boolean
  | null
  | undefined
  | Promise<AwaitedReactNode>;

/**
 * @internal The props any component can receive.
 * You don't have to add this type. All components automatically accept these props.
 * ```tsx
 * const Component = () => <div />;
 * <Component key="one" />
 * ```
 *
 * WARNING: The implementation of a component will never have access to these attributes.
 * The following example would be incorrect usage because {@link Component} would never have access to `key`:
 * ```tsx
 * const Component = (props: React.Attributes) => props.key;
 * ```
 */
export interface Attributes {
  key?: Key | null | undefined;
}
/**
 * The props any component accepting refs can receive.
 * Class components, built-in browser components (e.g. `div`) and forwardRef components can receive refs and automatically accept these props.
 * ```tsx
 * const Component = forwardRef(() => <div />);
 * <Component ref={(current) => console.log(current)} />
 * ```
 *
 * You only need this type if you manually author the types of props that need to be compatible with legacy refs.
 * ```tsx
 * interface Props extends React.RefAttributes<HTMLDivElement> {}
 * declare const Component: React.FunctionComponent<Props>;
 * ```
 *
 * Otherwise it's simpler to directly use {@link Ref} since you can safely use the
 * props type to describe to props that a consumer can pass to the component
 * as well as describing the props the implementation of a component "sees".
 * {@link RefAttributes} is generally not safe to describe both consumer and seen props.
 *
 * ```tsx
 * interface Props extends {
 *   ref?: React.Ref<HTMLDivElement> | undefined;
 * }
 * declare const Component: React.FunctionComponent<Props>;
 * ```
 *
 * WARNING: The implementation of a component will not have access to the same type in versions of React supporting string refs.
 * The following example would be incorrect usage because {@link Component} would never have access to a `ref` with type `string`
 * ```tsx
 * const Component = (props: React.RefAttributes) => props.ref;
 * ```
 */
export interface RefAttributes<T> extends Attributes {
  /**
   * Allows getting a ref to the component instance.
   * Once the component unmounts, React will set `ref.current` to `null`
   * (or call the ref with `null` if you passed a callback ref).
   *
   * @see {@link https://react.dev/learn/referencing-values-with-refs#refs-and-the-dom React Docs}
   */
  ref?: Ref<T> | undefined;
}

/**
 * Lets your component expose a DOM node to a parent component
 * using a ref.
 *
 * @see {@link https://react.dev/reference/react/forwardRef React Docs}
 * @see {@link https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forward_and_create_ref/ React TypeScript Cheatsheet}
 *
 * @param render See the {@link ForwardRefRenderFunction}.
 *
 * @template T The type of the DOM node.
 * @template P The props the component accepts, if any.
 *
 * @example
 *
 * ```tsx
 * interface Props {
 *   children?: ReactNode;
 *   type: "submit" | "button";
 * }
 *
 * export const FancyButton = forwardRef<HTMLButtonElement, Props>((props, ref) => (
 *   <button ref={ref} className="MyClassName" type={props.type}>
 *     {props.children}
 *   </button>
 * ));
 * ```
 */
export function forwardRef<T, P = {}>(
  render: ForwardRefRenderFunction<T, PropsWithoutRef<P>>
): ComponentType<PropsWithoutRef<P> & RefAttributes<T>> {
  return (props) => {
    return render(props, props.ref as ForwardedRef<T>);
  };
}

export function isValidElement(target: any): boolean {
  if (Array.isArray(target)) {
    return target.every(isValidElement);
  } else {
    return target instanceof HTMLElement || typeof target !== "object";
  }
}

type SingleOrArray<T> = T | readonly T[];

export const Children = {
  map<T, C>(
    children: SingleOrArray<C>,
    fn: (child: C, index: number) => T
  ): C extends null | undefined
    ? C
    : Array<Exclude<T, boolean | null | undefined>> {
    const handler = (child: C, index: number) => {
      switch (child) {
        case null:
        case undefined:
          return child as any as T;
        default:
          return fn(child, index);
      }
    };
    return (
      Array.isArray(children)
        ? children.map(handler)
        : [handler(children as C, 0)]
    ) as C extends null | undefined
      ? C
      : Exclude<T, boolean | null | undefined>[];
  },
  forEach<C>(
    children: SingleOrArray<C>,
    fn: (child: C, index: number) => void
  ): void {
    if (Array.isArray(children)) {
      children.forEach(fn);
    } else {
      fn(children as C, 0);
    }
  },
  count(children: any): number {
    return Array.isArray(children) ? children.length : 1;
  },
  only<C>(children: C): C extends any[] ? never : C {
    if (Array.isArray(children)) {
      throw new Error("Children must be a single element");
    } else {
      return children as C extends any[] ? never : C;
    }
  },
  toArray(
    children: JSX.Element | JSX.Element[]
  ): Array<Exclude<JSX.Element, boolean | null | undefined>> {
    return (Array.isArray(children) ? children : [children]) as Array<
      Exclude<JSX.Element, boolean | null | undefined>
    >;
  },
};

export default {
  ...hooks,
  createElement,
  version,
  forwardRef,
  isValidElement,
  Children,
};
