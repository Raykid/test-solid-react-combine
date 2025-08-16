import { Button, Space } from "antd";
import React, { FC } from "react";
import { takeFoo } from "../../services/foo";
import "./index.less";

export const Test: FC = () => {
  const {
    count,
    countText,
    setCount,
    incrementTwice,
    incrementMultiTimes,
    // autoPlusCount,
  } = takeFoo();

  return (
    <div className="test">
      <div>{countText}</div>
      <Space.Compact>
        <Button
          onClick={() => {
            setCount(count + 1);
          }}
        >
          Increment
        </Button>
        <Button
          onClick={() => {
            incrementTwice(1);
          }}
        >
          Increment Twice
        </Button>
        <Button
          onClick={() => {
            console.time("incrementMultiTimes");
            incrementMultiTimes(1000000);
            console.timeEnd("incrementMultiTimes");
          }}
        >
          Increment 1 1000000 times
        </Button>
      </Space.Compact>
      {/* <div>autoPlusCount: {autoPlusCount}</div> */}
    </div>
  );
};
