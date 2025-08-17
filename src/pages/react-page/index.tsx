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

  const [autoPlusCount, setAutoPlusCount] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => {
      setAutoPlusCount((count) => count + 1);
    }, 5000);
    return () => {
      clearTimeout(id);
    };
  }, [autoPlusCount]);

  useEffect(() => {
    console.log("useEffect called: " + count);
    return () => {
      console.log("useEffect cleanup: " + count);
    };
  }, [count, autoPlusCount]);

  useLayoutEffect(() => {
    console.log("useLayoutEffect called: " + count);
    return () => {
      console.log("useLayoutEffect cleanup: " + count);
    };
  }, [count, count, autoPlusCount]);

  useInsertionEffect(() => {
    console.log("useInsertionEffect called: " + count);
    return () => {
      console.log("useInsertionEffect cleanup: " + count);
    };
  }, [count, doubleCount, autoPlusCount]);

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
