import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = process.argv[2];
// Existing generator validates a new absolute destination outside the checkout.
execFileSync(
  process.execPath,
  [
    path.join(root, "scripts/prepare-assessment-browser-fixture.mjs"),
    destination ?? "",
  ],
  { stdio: "inherit" },
);
const files = [
  [
    "src/app/schools/[slug]/reporting/page.tsx",
    "src/app/schools/[slug]/reporting/page.tsx",
  ],
  ["src/lib/reporting-queue.ts", "src/lib/reporting-queue.ts"],
  ["src/lib/export-pagination.ts", "src/lib/export-pagination.ts"],
  ["src/lib/record-time.ts", "src/lib/record-time.ts"],
  ["tests/browser/reporting-fixture/auth.ts.txt", "src/lib/auth.ts"],
  [
    "tests/browser/reporting-fixture/actions.ts.txt",
    "src/app/schools/[slug]/reporting/actions.ts",
  ],
];
const hashes = JSON.parse(
  await fs.readFile(path.join(destination, "source-hashes.json"), "utf8"),
);
for (const [source, target] of files) {
  const content = await fs.readFile(path.join(root, source));
  await fs.mkdir(path.dirname(path.join(destination, target)), {
    recursive: true,
  });
  await fs.writeFile(path.join(destination, target), content);
  hashes.push({
    source,
    target,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}
await fs.writeFile(
  path.join(destination, "source-hashes.json"),
  JSON.stringify(hashes, null, 2),
);
console.log(
  "Open /schools/fake-school/reporting. All data is synthetic; no hosted client is present.",
);
