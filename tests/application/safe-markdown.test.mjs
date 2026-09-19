import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import vm from "node:vm";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = await fs.readFile(
  new URL("../../src/components/safe-markdown.tsx", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const component = {};
vm.runInNewContext(code, {
  exports: component,
  require(name) {
    assert.equal(name, "react/jsx-runtime");
    return jsx;
  },
});
const render = (markdown) =>
  renderToStaticMarkup(
    React.createElement(component.SafeMarkdown, { markdown }),
  );

test("curriculum headings, emphasis and numbered steps render semantically", () => {
  const html = render(
    "## Topic\n\n### Detail\n\n**Important** instruction.\n\n3. First step\n4. **Next** step\n\n- One\n- Two",
  );
  assert.match(html, /<h2>Topic<\/h2>/);
  assert.match(html, /<h3>Detail<\/h3>/);
  assert.match(html, /<strong>Important<\/strong>/);
  assert.match(
    html,
    /<ol><li value="3">First step<\/li><li value="4"><strong>Next<\/strong> step<\/li><\/ol>/,
  );
  assert.match(html, /<ul><li>One<\/li><li>Two<\/li><\/ul>/);
});
test("lesson markup never executes HTML or creates untrusted links", () => {
  const html = render(
    "## <img src=x onerror=alert(1)>\n\n**<script>alert(1)</script>**\n\n[go](javascript:alert(1))\n\n1. <iframe src=x>",
  );
  assert.doesNotMatch(html, /<(script|img|iframe|a)\b/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
});
test("saved resume block positions and legacy headings remain unchanged", () => {
  const input =
    "# Legacy\n\n## New\n\n### Subtopic\n\n1. One\n2. Two\n\n**Last**";
  assert.equal(component.markdownBlocks(input).length, 5);
  assert.match(render(input), /^<div class="lesson-content"><h2>Legacy<\/h2>/);
  assert.match(render("Incomplete **bold"), /Incomplete \*\*bold/);
});
