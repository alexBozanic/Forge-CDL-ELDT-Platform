import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// Local-only UI fixture. Never installs packages, contacts Supabase, or changes
// the application checkout. The destination must be a new directory outside it.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination))
  throw new Error(
    "Supply a new absolute fixture directory outside the repository.",
  );
const relative = path.relative(root, destination);
if (
  !relative ||
  (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
)
  throw new Error("The fixture must be outside the application repository.");
await fs.mkdir(destination);
await fs.mkdir(path.join(destination, "src/app"), { recursive: true });
await fs.mkdir(path.join(destination, "src/lib"), { recursive: true });
await fs.mkdir(path.join(destination, "src/components"), { recursive: true });
const files = [
  ["src/lib/auth-action.ts", "src/lib/auth-action.ts"],
  ["src/lib/password-input.ts", "src/lib/password-input.ts"],
  ["src/lib/invitation-request.ts", "src/lib/invitation-request.ts"],
  [
    "src/components/use-invitation-action.ts",
    "src/components/use-invitation-action.ts",
  ],
  ["src/app/schools/[slug]/invitation-form.tsx", "src/app/invitation-form.tsx"],
  [
    "src/app/platform/schools/admin-invitation-form.tsx",
    "src/app/admin-invitation-form.tsx",
  ],
  [
    "src/app/schools/[slug]/courses/[enrollmentId]/attempts/[attemptId]/attempt-form.tsx",
    "src/app/attempt-form.tsx",
  ],
  [
    "src/app/schools/[slug]/courses/[enrollmentId]/assessments/[assessmentId]/start-form.tsx",
    "src/app/start-form.tsx",
  ],
  ["src/lib/assessment-submission.ts", "src/lib/assessment-submission.ts"],
  ["src/lib/assessment-start.ts", "src/lib/assessment-start.ts"],
  ["src/lib/lesson-interaction.ts", "src/lib/lesson-interaction.ts"],
  ["src/lib/draft-content.ts", "src/lib/draft-content.ts"],
  ["src/lib/mutation-feedback.ts", "src/lib/mutation-feedback.ts"],
  ["src/lib/school-mutation.ts", "src/lib/school-mutation.ts"],
  ["src/components/mutation-form.tsx", "src/components/mutation-form.tsx"],
  [
    "src/app/platform/courses/[versionId]/draft-content-form.tsx",
    "src/app/draft-content-form.tsx",
  ],
  [
    "src/app/schools/[slug]/courses/[enrollmentId]/lessons/[lessonId]/lesson-interactions.tsx",
    "src/app/lesson-interactions.tsx",
  ],
  ["src/app/layout.tsx", "src/app/layout.tsx"],
  ["src/app/styles.css", "src/app/styles.css"],
  ["tests/browser/assessment-fixture/page.tsx.txt", "src/app/page.tsx"],
  ["tests/browser/assessment-fixture/actions.ts.txt", "src/app/actions.ts"],
];
const hashes = [];
for (const [source, target] of files) {
  const contents = await fs.readFile(path.join(root, source));
  await fs.writeFile(path.join(destination, target), contents);
  hashes.push({
    source,
    target,
    sha256: createHash("sha256").update(contents).digest("hex"),
  });
}
const pkg = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
);
await fs.writeFile(
  path.join(destination, "package.json"),
  JSON.stringify(
    {
      name: "forge-local-form-fixture",
      private: true,
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies,
    },
    null,
    2,
  ),
);
await fs.writeFile(
  path.join(destination, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        resolveJsonModule: true,
        isolatedModules: true,
        paths: { "@/*": ["./src/*"] },
      },
      include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  ),
);
await fs.writeFile(
  path.join(destination, "next.config.mjs"),
  "export default { outputFileTracingRoot: process.cwd(), devIndicators: false };\n",
);
await fs.writeFile(
  path.join(destination, "source-hashes.json"),
  JSON.stringify(hashes, null, 2),
);
await fs.symlink(
  path.join(root, "node_modules"),
  path.join(destination, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);
console.log(
  "Fixture prepared. From its directory, run: node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3721",
);
