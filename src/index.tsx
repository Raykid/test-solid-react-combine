/// <reference types="antd" />

import Space from "antd/es/space";
import React, { createElement as _createElement, createContext } from "react";
import { render } from "solid-js/web";

const a: number = 1;
console.log(a);

createContext;

const clsMap = {
  root: "root",
  panel: "panel",
};
const type = "panel";

render(() => {
  return (
    <div class="root">
      {React.createElement(clsMap[type], null, _createElement(clsMap["root"]))}
      {/* {React.createElement(clsMap[type] || null)}
      {React.createElement(clsMap[type] ? clsMap[type] : null)}
      {React.createElement((clsMap[type] && clsMap[type]) || null)} */}
      {
        React.createElement(
          "div",
          { a: 1, b: "test", c: () => {}, d: { e: 3, f: 4 } },
          _createElement("div", null, "Hello World", 1, 2),
          (<Space />) as any
        ) as any
      }
      <br />
    </div>
  );
}, document.getElementById("root")!);
