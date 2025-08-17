import { createSignal } from "solid-js";
import "./index.less";

export const SolidPage = () => {
  const [count, setCount] = createSignal(0);

  return (
    <div class="solid-page">
      solid
      <div>{count()}</div>
      <button
        onClick={() => {
          setCount(count() + 1);
        }}
      >
        increment
      </button>
    </div>
  );
};
