const acorn = require("acorn");
const jsx = require("acorn-jsx");
const JSXParser = acorn.Parser.extend(jsx());
const traverse = require("traverse");

module.exports = transformSource;

const createElementNameGroups = [];
function hasImportedCreateElement(name) {
  return createElementNameGroups.some((group) => group.includes(name));
}

const useEffectNameGroups = [];
function hasImportedUseEffect(name) {
  return useEffectNameGroups.some((group) => group.includes(name));
}

const regAnonymousFunction = /(?<=function\s*)\(/;
function handleBeforeAST(source) {
  const resAnonymousFunction = regAnonymousFunction.exec(source);
  if (resAnonymousFunction) {
    let anonymousFunctionName = "___";
    while (source.includes(anonymousFunctionName)) {
      anonymousFunctionName += "_";
    }
    // 将匿名函数替换为具名函数，否则会编译报错
    source = `${source.slice(0, resAnonymousFunction.index)} ${anonymousFunctionName}${source.slice(resAnonymousFunction.index)}`;
  }
  return source;
}

function transformSource(source) {
  let defaultReactName = "React";
  const createElementNames = [];
  createElementNameGroups.push(createElementNames);
  const useEffectNames = [];
  useEffectNameGroups.push(useEffectNames);
  source = handleBeforeAST(source);
  // 如果是函数，外面需要包一层括号，否则报错
  const ast = JSXParser.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  const results = [];
  let lastIndex = 0;
  traverse(ast.body).forEach(function (node) {
    if (!!node && typeof node === "object" && node.start >= lastIndex) {
      switch (node.type) {
        case "ImportDeclaration":
          if (node.source.value === "react") {
            node.specifiers.forEach((specifier) => {
              if (
                specifier.type === "ImportDefaultSpecifier" ||
                specifier.type === "ImportNamespaceSpecifier"
              ) {
                defaultReactName = specifier.local.name;
              } else if (specifier.type === "ImportSpecifier") {
                if (specifier.imported.name === "default") {
                  defaultReactName = specifier.local.name;
                } else if (specifier.imported.name === "createElement") {
                  createElementNames.push(specifier.local.name);
                } else if (
                  specifier.imported.name === "useEffect" ||
                  specifier.imported.name === "useLayoutEffect" ||
                  specifier.imported.name === "useInsertionEffect"
                ) {
                  useEffectNames.push(specifier.local.name);
                }
              }
            });
          }
          break;
        case "CallExpression":
          if (
            (node.callee.type === "MemberExpression" &&
              handleValue(source, node.callee.object) === defaultReactName &&
              handleValue(source, node.callee.property) === "createElement") ||
            (node.callee.type === "Identifier" &&
              hasImportedCreateElement(handleValue(source, node.callee)))
          ) {
            results.push(source.slice(lastIndex, node.start));
            results.push(handleCreateElement(source, node));
            lastIndex = node.end;
          } else if (
            (node.callee.type === "MemberExpression" &&
              handleValue(source, node.callee.object) === defaultReactName &&
              handleValue(source, node.callee.property) === "useEffect") ||
            (node.callee.type === "Identifier" &&
              hasImportedUseEffect(handleValue(source, node.callee)))
          ) {
            // 收集变量使用
            const identifierMap = {};
            const whiteList = [];
            const useEffectBlock = node.arguments[0].body;
            traverse(useEffectBlock).forEach(function (child) {
              if (!!child && typeof child === "object") {
                if (child.type === "Identifier") {
                  if (
                    this.parent.node.type !== "MemberExpression" ||
                    child === this.parent.node.object
                  ) {
                    switch (this.parent.node.type) {
                      case "VariableDeclarator":
                      case "Property":
                        if (!whiteList.includes(child.name)) {
                          whiteList.push(child.name);
                          delete identifierMap[child.name];
                        }
                        break;
                      default:
                        if (!whiteList.includes(child.name)) {
                          let children = identifierMap[child.name];
                          if (!children) {
                            identifierMap[child.name] = children = [];
                          }
                          children.push(child);
                        }
                        break;
                    }
                  }
                }
              }
            });
            const useEffectBlockSource = source.slice(
              useEffectBlock.start,
              useEffectBlock.end
            );
            const identifiers = [];
            Object.keys(identifierMap).forEach((name) => {
              results.push(source.slice(lastIndex, useEffectBlock.start + 1));
              // 找到一个新名字
              let newName = name + "_";
              while (useEffectBlockSource.includes(newName)) {
                newName += "_";
              }
              identifierMap[name].forEach((identifier) => {
                identifier.newName = newName;
                identifiers.push(identifier);
              });
              results.push(
                `\nvar ${newName} = typeof ${name} === "function" && Symbol.solidPatchDeps in ${name} ? ${name}(Symbol.symbolValidate) : ${name};`
              );
              lastIndex = useEffectBlock.start + 1;
            });
            identifiers
              .sort((a, b) => {
                return a.start - b.start;
              })
              .forEach((identifier) => {
                results.push(source.slice(lastIndex, identifier.start));
                results.push(identifier.newName);
                lastIndex = identifier.end;
              });
          }
          break;
        case "JSXExpressionContainer":
          if (
            node.expression.type !== "Identifier" &&
            node.expression.type !== "FunctionExpression" &&
            node.expression.type !== "CallExpression"
          ) {
            // 这里给所有 JSX 表达式容器套一层立即执行的函数，增强表达式的响应能力
            results.push(source.slice(lastIndex, node.start));
            if (node.expression.type === "ObjectExpression") {
              results.push(
                `{{${node.expression.properties
                  .map((property) => {
                    return `${property.key.raw ?? handleValue(source, property.key)}: ${transformSource(property.value.raw)}`;
                  })
                  .join(",")}}}`
              );
            } else {
              results.push(
                `{(function(){return ${transformSource(source.slice(node.start + 1, node.end - 1))}})()}`
              );
            }
            lastIndex = node.end;
          }
          break;
        case "JSXElement":
          const tagName = node.openingElement.name.name;
          if (!/^[a-z]/.test(tagName)) {
            // 非小写字母开头的 jsx tag，为了避免字符串变量的使用，包一层函数
            let newName = tagName + "_";
            const nodeStr = source.slice(node.start, node.end);
            while (
              newName === "__wrapSolidComp__" ||
              nodeStr.includes(newName)
            ) {
              newName += "_";
            }
            results.push(source.slice(lastIndex, node.start));
            const openingElementStr = `<${newName}${source.slice(
              node.openingElement.start + tagName.length + 1,
              node.openingElement.end
            )}`;
            const childrenStr = node.children.reduce((str, child) => {
              let childStr = transformSource(
                source.slice(child.start, child.end)
              );
              if (child.type === "JSXElement") {
                childStr = `{${childStr}}`;
              }
              return str + childStr;
            }, "");
            const closingElementStr = node.closingElement
              ? `</${newName}>`
              : "";
            let result = `(()=>{var ${newName} = __wrapSolidComp__(${tagName});return ${openingElementStr}${childrenStr}${closingElementStr}})()`;
            if (
              this.parent.key === "children" &&
              this.parent.parent.node.type === "JSXElement"
            ) {
              result = `{${result}}`;
            }
            results.push(result);
            lastIndex = node.end;
          }
          break;
        default:
          break;
      }
    }
  });
  if (lastIndex < source.length) {
    results.push(source.slice(lastIndex));
  }
  source = results.join("");
  // 清空引用列表
  createElementNameGroups.splice(
    createElementNameGroups.indexOf(createElementNames),
    1
  );
  useEffectNameGroups.splice(useEffectNameGroups.indexOf(useEffectNames), 1);
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
      if (value.property.type === "Literal") {
        result = `${obj}[${value.property.raw}]`;
      } else if (value.property.type === "Identifier") {
        result = `${obj}["${prop}"]`;
      } else {
        result = `${obj}[${prop}]`;
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
      let value = handleValue(source, props.value);
      if (props.value.type === "CallExpression") {
        value = transformSource(value);
      }
      result = `${key}=${props.value.type === "Literal" && typeof value === "string" ? `${props.value.raw}` : `{${value}}`}`;
      break;
    }
    case "SpreadElement": {
      result = `{${source.slice(props.start, props.end)}}`;
      break;
    }
    default: {
      result = `{...(${source.slice(props.start, props.end)})}`;
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
          return transformSource(source.slice(child.start, child.end));
        default:
          return `{${transformSource(source.slice(child.start, child.end))}}`;
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
      return `(function(){var ${tag}=__wrapSolidComp__(${identifierStr});return ${
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
