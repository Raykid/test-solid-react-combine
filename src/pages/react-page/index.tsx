import {
  FC,
  useCallback,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import "./index.less";

export const ReactPage: FC = () => {
  const [count, setCount] = useState(0);

  const doubleCount = useMemo(() => {
    return count * 2;
  }, [count]);

  const increment = useCallback(() => {
    setCount((count) => count + 1);
  }, []);

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
  }, [count]);

  useInsertionEffect(() => {
    console.log("useInsertionEffect called: " + count);
    return () => {
      console.log("useInsertionEffect cleanup: " + count);
    };
  }, [count]);

  return (
    <div class="react-page">
      react
      <div>{count}</div>
      <div>{doubleCount}</div>
      <button
        class={count + "1"}
        onClick={() => {
          increment();
        }}
      >
        increment
      </button>
    </div>
  );
};
