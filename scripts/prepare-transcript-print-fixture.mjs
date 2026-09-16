import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination))
  throw new Error(
    "Supply a new absolute output directory outside the repository.",
  );
const relative = path.relative(root, destination);
if (
  !relative ||
  (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
)
  throw new Error("Output must be outside the repository.");

// Run the unchanged presentation code with explicit fake read adapters. No real
// authorization/database modules or environment files are loaded.
const require = createRequire(import.meta.url);
const timeSource = await fs.readFile(
  path.join(root, "src/lib/record-time.ts"),
  "utf8",
);
const pagePath = "src/app/schools/[slug]/reporting/[completionId]/page.tsx";
const pageSource = await fs.readFile(path.join(root, pagePath), "utf8");
const css = await fs.readFile(path.join(root, "src/app/styles.css"), "utf8");
function evaluate(source, imports) {
  const exports = {};
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (Object.hasOwn(imports, name)) return imports[name];
      if (name === "react/jsx-runtime") return require(name);
      throw new Error(`Unexpected fixture dependency: ${name}`);
    },
    Intl,
    Date,
  });
  return exports;
}
const timestamp = "2026-09-14T12:00:00Z";
const hash = "abcdef0123456789".repeat(4);
const identity = {
  legal_first_name: "Synthetic",
  legal_last_name: "Print Fixture",
  date_of_birth: "1990-01-01",
  license_or_permit_number: "FAKE-PRINT-ONLY",
  issuing_jurisdiction: "XX",
};
const transcript = {
  completion: {
    id: "fixture",
    completed_at: timestamp,
    course_manifest_hash: hash,
    qualifying_attempt_id: "attempt-30",
    student_identity_snapshot: identity,
    provider_snapshot: {
      name: "Synthetic Print Test School",
      provider_identifier: "FAKE-PROVIDER",
    },
  },
  course: {
    version_id: "00000000-0000-4000-8000-000000000001",
    title: "Synthetic long transcript - pagination verification only",
    version_number: 1,
    published_at: timestamp,
  },
  lessons: Array.from({ length: 60 }, (_, i) => ({
    lesson_id: `lesson-${i + 1}`,
    title: `Lesson ${String(i + 1).padStart(3, "0")} - Synthetic long lesson title for printable history verification`,
    manifest_position: i + 1,
    content_hash: hash,
    first_opened_at: timestamp,
    last_opened_at: timestamp,
    completed_at: timestamp,
  })),
  attempts: Array.from({ length: 30 }, (_, i) => ({
    id: `attempt-${i + 1}`,
    assessment_title: `Assessment ${String(i + 1).padStart(3, "0")} - Synthetic practice assessment`,
    assessment_kind: "practice",
    attempt_number: i + 1,
    status: "passed",
    passing_percent: 80,
    score_percent: 100,
    correct_count: 10,
    question_count: 10,
    started_at: timestamp,
    expires_at: timestamp,
    submitted_at: timestamp,
    qualifying: i === 29,
  })),
  corrections: Array.from({ length: 20 }, (_, i) => ({
    field_name: `Synthetic correction ${String(i + 1).padStart(3, "0")}`,
    prior_value: "Original fake value",
    corrected_value: "Corrected fake value",
    reason:
      "Synthetic correction reason for print wrapping and pagination verification. No real record was changed.",
    occurred_at: timestamp,
  })),
  reporting: {
    status: "not_submitted",
    identity_snapshot: identity,
    provider_snapshot: {},
    events: Array.from({ length: 20 }, (_, i) => ({
      from_status: "not_ready",
      to_status: "ready",
      reason: `Synthetic reporting event ${String(i + 1).padStart(3, "0")} - print fixture only.`,
      occurred_at: timestamp,
    })),
  },
};
const page = evaluate(pageSource, {
  "@/lib/record-time": evaluate(timeSource, {}),
  "next/link": {
    __esModule: true,
    default: ({ children, ...props }) =>
      React.createElement("a", props, children),
  },
  "next/navigation": {
    notFound() {
      throw new Error("Unexpected fixture notFound");
    },
  },
  "@/lib/auth": {
    getAuthorizationContext: async () => ({
      supabase: null,
      isPlatformAdministrator: true,
      memberships: [],
    }),
  },
  "@/lib/school-transcript": { loadSchoolTranscript: async () => transcript },
});
const markup = renderToStaticMarkup(
  await page.default({
    params: Promise.resolve({ slug: "fixture", completionId: "fixture" }),
  }),
);
await fs.mkdir(destination);
await fs.writeFile(
  path.join(destination, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic transcript print fixture</title><style>${css}</style></head><body>${markup}</body></html>`,
);
await fs.writeFile(
  path.join(destination, "source-hashes.json"),
  JSON.stringify(
    [
      [pagePath, pageSource],
      ["src/app/styles.css", css],
      ["src/lib/record-time.ts", timeSource],
    ].map(([source, contents]) => ({
      source,
      sha256: createHash("sha256").update(contents).digest("hex"),
    })),
    null,
    2,
  ),
);
console.log(
  `Synthetic transcript generated in ${destination}. No hosted reads or writes.`,
);
