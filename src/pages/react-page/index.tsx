import {
  FC,
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { SomeContext } from "../contexts/some-context";
import "./index.less";

function reducer(
  state: { count: number },
  action: {
    type: string;
    payload: number;
  }
) {
  switch (action.type) {
    case "increment":
      return { ...state, count: state.count + action.payload };
    case "decrement":
      return { ...state, count: state.count - action.payload };
    default:
      return state;
  }
}

export const ReactPage: FC = () => {
  const [count, setCount] = useState(0);

  const doubleCount = useMemo(() => {
    return count * 2;
  }, [count]);

  const increment = useCallback(
    (add: number) => {
      setCount((count) => count + add);
    },
    [count]
  );

  useEffect(() => {
    console.log("useEffect called: " + count);
    return () => {
      console.log("useEffect cleanup: " + count);
    };
  }, [count]);

  useLayoutEffect(() => {
    console.log("useLayoutEffect called: " + count);
    return () => {
      console.log("useLayoutEffect cleanup: " + count);
    };
  }, [count, count]);

  useInsertionEffect(() => {
    console.log("useInsertionEffect called: " + count);
    return () => {
      console.log("useInsertionEffect cleanup: " + count);
    };
  }, [count, doubleCount]);

  useEffect(() => {
    console.log("increment changed", increment);
  }, [increment]);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(ref.current);
  }, [count]);

  const context = useContext(SomeContext);

  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <div class="react-page">
      react
      <div ref={ref}>{count}</div>
      <div>{doubleCount}</div>
      <button
        class={count + "1"}
        onClick={() => {
          increment(3);
        }}
      >
        increment
      </button>
      <div>Context value1: {context.a}</div>
      <SomeContext.Consumer>
        {(value) => <div>Context value2: {value.a}</div>}
      </SomeContext.Consumer>
      <div
        onClick={() => {
          dispatch({ type: "decrement", payload: 1 });
        }}
      >
        useReducer {state.count}
      </div>
    </div>
  );
};
