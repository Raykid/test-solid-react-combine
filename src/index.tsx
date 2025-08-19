/// <reference types="antd" />

import { CiOutlined } from "@ant-design/icons";
import { render } from "solid-js/web";
import { enablePatch } from "./solid-react-adapter/patch";

enablePatch();

render(() => {
  return (
    <div
      style={{
        "font-size": "14px",
        color: "black",
      }}
    >
      <CiOutlined />
    </div>
  );
}, document.getElementById("root")!);
