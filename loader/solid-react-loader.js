const acorn = require("acorn");
const traverse = require("traverse");
const jsx = require("acorn-jsx");
const JSXParser = acorn.Parser.extend(jsx());

module.exports = transformSouce;

const createElementNameGroups = [];
function hasImported(name) {
  return createElementNameGroups.some((group) => group.includes(name));
}

function transformSouce(source) {
  const createElementNames = [];
  createElementNameGroups.push(createElementNames);
  const ast = JSXParser.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  const nodes = traverse(ast.body).nodes();
  const results = [];
  let lastIndex = 0;
  for (const node of nodes) {
    if (!!node && typeof node === "object" && node.start >= lastIndex) {
      switch (node.type) {
        case "ImportSpecifier":
          // 先查找 React.createElement 引用
          if (node.imported.name === "createElement") {
            createElementNames.push(node.local.name);
          }
          break;
        case "CallExpression":
          if (
            (node.callee.type === "MemberExpression" &&
              handleValue(source, node.callee.object) === "React" &&
              handleValue(source, node.callee.property) === "createElement") ||
            (node.callee.type === "Identifier" &&
              hasImported(handleValue(source, node.callee)))
          ) {
            if (lastIndex < node.start) {
              results.push(source.slice(lastIndex, node.start));
            }
            results.push(handleCreateElement(source, node));
            lastIndex = node.end;
          }
          break;
        default:
          break;
      }
    }
  }
  if (lastIndex < source.length) {
    results.push(source.slice(lastIndex));
  }
  source = results.join("");
  // 清空引用列表
  createElementNameGroups.splice(
    createElementNameGroups.indexOf(createElementNames),
    1
  );
  return source;
}

function handleValue(source, value) {
  let result = "";
  switch (value.type) {
    case "Identifier": {
      result = value.name;
      break;
    }
    case "Literal": {
      result = value.value;
      break;
    }
    case "MemberExpression": {
      const obj = handleValue(source, value.object);
      const prop = handleValue(source, value.property);
      if (value.property.type === "Identifier") {
        result = `${obj}[${prop}]`;
      } else {
        result = `${obj}.${prop}`;
      }
      break;
    }
    default: {
      result = source.slice(value.start, value.end);
      break;
    }
  }
  return result;
}

function handleProps(source, props) {
  let result = "";
  switch (props.type) {
    case "ObjectExpression": {
      result = props.properties
        .map((prop) => handleProps(source, prop))
        .join(" ");
      break;
    }
    case "Identifier": {
      const propsValue = props.value ?? {};
      result = Object.keys(propsValue)
        .map((key) => {
          return `${key}="${propsValue[key]}"`;
        })
        .join(" ");
      break;
    }
    case "Property": {
      let key = handleValue(source, props.key);
      if (key === "className") {
        key = "class";
      }
      const value = handleValue(source, props.value);
      result = `${key}=${props.value.type === "Literal" && typeof value === "string" ? `"${value}"` : `{${value}}`}`;
      break;
    }
    default: {
      break;
    }
  }
  return result;
}

function handleCreateElement(source, node) {
  const [identifier, props = {}, ...children] = node.arguments;
  const identifierStr = handleValue(source, identifier);
  const childrenStr = children
    .map((child) => {
      switch (child.type) {
        case "Identifier":
          return `{${child.name}}`;
        case "JSXElement":
          return transformSouce(source.slice(child.start, child.end));
        default:
          return `{${transformSouce(source.slice(child.start, child.end))}}`;
      }
    })
    .join("");
  switch (identifier.type) {
    case "MemberExpression":
    case "LogicalExpression":
    case "ConditionalExpression": {
      const propsStr = handleProps(source, props);
      let tag = "TempCls";
      // 处理 tag，不能与任何变量重复，有重复就加_
      while (
        identifierStr.includes(tag) ||
        propsStr.includes(tag) ||
        childrenStr.includes(tag)
      ) {
        tag += "_";
      }
      return `(function(){var ${tag}=${identifierStr};return ${
        childrenStr
          ? `<${tag} ${propsStr}>${childrenStr}</${tag}>`
          : `<${tag} ${propsStr}/>`
      }})()`;
    }
    default: {
      return childrenStr
        ? `<${identifierStr} ${handleProps(source, props)}>${childrenStr}</${identifierStr}>`
        : `<${identifierStr} ${handleProps(source, props)} />`;
    }
  }
}
