import { NodePath } from "@babel/core";
import {
  callExpression,
  identifier,
  isExpression,
  isIdentifier,
  objectExpression,
  objectProperty,
  stringLiteral,
} from "@babel/types";
import { MacroContext } from "./context";
import { escapeClassName } from "./escape";
import { runtimeNames } from "./runtime";
import { convertTemplateStringWithStylis } from "./transform/css";
import { determineComponentName } from "./transform/determineComponentName";
import { randomName } from "./util/randomName";

export function visitStyled(reference: NodePath, context: MacroContext) {
  const { parentPath } = reference;

  if (
    parentPath.isMemberExpression() &&
    parentPath.node.object === reference.node
  ) {
    // styled.xxx
    const grandpa = parentPath.parentPath;

    if (
      grandpa.isTaggedTemplateExpression() &&
      grandpa.node.tag === parentPath.node
    ) {
      // styled.xxx` css... `
      const access = parentPath.node;
      const { computed, property } = access;
      const elementName =
        computed || !isIdentifier(property)
          ? property
          : stringLiteral(property.name);

      if (isExpression(elementName)) {
        const quasi = grandpa.node.quasi;

        const className =
          "castella-" +
          escapeClassName(determineComponentName(grandpa) || randomName()) +
          "-" +
          context.fileNameHash;
        const cssString = convertTemplateStringWithStylis(
          quasi,
          `.${className}`
        );

        const styledComponent = context.importRuntime(
          grandpa.scope,
          runtimeNames.styledComponent
        );

        const obj = objectExpression([
          objectProperty(identifier("css"), cssString),
          objectProperty(identifier("className"), stringLiteral(className)),
          objectProperty(identifier("element"), elementName),
        ]);

        const replacement = callExpression(styledComponent, [obj]);
        grandpa.replaceWith(replacement);
        return;
      }
    }
  }
}
