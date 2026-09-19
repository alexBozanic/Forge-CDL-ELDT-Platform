import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import vm from "node:vm";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = await fs.readFile(
  new URL(
    "../../src/app/schools/[slug]/courses/[enrollmentId]/lessons/[lessonId]/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;
function fixture(failedTable, progress = null) {
  let interactions = 0;
  const rows = {
    organizations: { id: "school", name: "Synthetic School" },
    enrollments: { id: "enrollment", course_version_id: "version" },
    course_lessons: {
      id: "lesson",
      title: "Synthetic lesson",
      body_markdown: "Body",
      estimated_minutes: 1,
    },
    course_version_manifest_lessons: [
      { lesson_id: "lesson", manifest_position: 1 },
    ],
    lesson_progress: progress,
  };
  const supabase = {
    from(table) {
      const result = {
        data: rows[table],
        error:
          table === failedTable ? { message: "PRIVATE DATABASE DETAIL" } : null,
      };
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single() {
          return Promise.resolve(result);
        },
        maybeSingle() {
          return Promise.resolve(result);
        },
        order() {
          return Promise.resolve(result);
        },
      };
    },
  };
  const imports = {
    "react/jsx-runtime": jsx,
    "next/link": ({ children }) => React.createElement("a", null, children),
    "next/navigation": {
      notFound() {
        throw Error("NOT_FOUND");
      },
    },
    "@/lib/auth": {
      requireUser: async () => ({ supabase, user: { id: "learner" } }),
    },
    "@/components/safe-markdown": {
      SafeMarkdown: () => "Body",
      markdownBlocks: () => ["Body"],
    },
    "./lesson-interactions": {
      LessonInteractions: () => {
        interactions++;
        return "INTERACTION_CONTROLS";
      },
    },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (!Object.hasOwn(imports, name))
        throw Error(`Unexpected dependency ${name}`);
      return imports[name];
    },
  });
  return {
    async render() {
      return renderToStaticMarkup(
        await exports.default({
          params: Promise.resolve({
            slug: "synthetic",
            enrollmentId: "enrollment",
            lessonId: "lesson",
          }),
        }),
      );
    },
    interactions: () => interactions,
  };
}
test("failed lesson reads never render progress or mount interaction controls", async () => {
  for (const table of [
    "course_lessons",
    "course_version_manifest_lessons",
    "lesson_progress",
  ]) {
    const f = fixture(table);
    await assert.rejects(f.render(), {
      message: "Lesson information is temporarily unavailable.",
    });
    assert.equal(f.interactions(), 0);
  }
});
test("an absent progress record remains a valid first lesson visit", async () => {
  const f = fixture();
  assert.match(await f.render(), /not started/);
  assert.equal(f.interactions(), 1);
});
test("successful progress reads retain completed status and saved resume point", async () => {
  const f = fixture(undefined, { status: "completed", resume_position: 2 });
  const html = await f.render();
  assert.match(html, /completed/);
  assert.match(html, /Continue near section 3/);
  assert.equal(f.interactions(), 1);
});
