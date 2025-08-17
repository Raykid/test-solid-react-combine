/// <reference types="antd" />

import * as _react from "react";
import { createElement as _createElement } from "react";
import { render } from "solid-js/web";
import { ReactPage } from "./pages/react-page";
import { SolidPage } from "./pages/solid-page";

const a: number = 1;
console.log(a);

const clsMap = {
  root: (props: any) =>
    _createElement(
      "div",
      { onClick: props.onClick },
      "Root",
      props.e,
      props.f,
      props.children
    ),
  '"pan.el': () => _createElement("span", null, "Panel"),
};
const type = "panel";

let target: HTMLDivElement | undefined = undefined;

render(() => {
  return (
    <div class="root" ref={target}>
      {/* {React.createElement(clsMap[type], null, _createElement(clsMap["root"]))} */}
      {_react.createElement(clsMap['"pan.el'])}
      {/* {React.createElement(clsMap[type] ? clsMap[type] : null)}
      {React.createElement((clsMap[type] && clsMap[type]) || null)} */}
      {
        _react.createElement(
          clsMap.root,
          {
            a: 1,
            b: '"test',
            c: () => {},
            d: { e: 3, f: 4 },
            e: <div>e</div>,
            f: _createElement("div", null, '"f'),
            onClick: () => {
              console.log("ref target");
              console.log(target);
            },
          },
          _createElement("div", null, "Hello World", 1, 2)
        ) as any
      }
      <br />
      <SolidPage />
      <ReactPage />
    </div>
  );
}, document.getElementById("root")!);
