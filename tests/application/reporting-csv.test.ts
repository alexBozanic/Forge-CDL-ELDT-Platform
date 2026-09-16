import assert from "node:assert/strict";
import test from "node:test";
import { reportingCsvCell } from "../../src/lib/reporting-csv.ts";

test("CSV escapes formula prefixes, controls and locale variants as text", () => {
  for (const value of [
    "=1+1",
    "+1",
    "-1",
    "@SUM(A1)",
    "\ttext",
    "\rtext",
    "\ntext",
    "  =1+1",
    "\u0000=1+1",
    "\uff1d1+1",
    "\uff0b1",
    "\uff0d1",
    "\uff20SUM(A1)",
  ]) {
    assert.equal(reportingCsvCell(value), `"'${value}"`);
  }
});
test("CSV keeps delimiters, quotes and embedded newlines inside one quoted cell", () => {
  assert.equal(
    reportingCsvCell('Synthetic, "Learner"\nSecond line'),
    '"Synthetic, ""Learner""\nSecond line"',
  );
  assert.equal(reportingCsvCell('=1+2";=1+2'), '"\'=1+2"";=1+2"');
  assert.equal(reportingCsvCell('safe",=1+2'), '"safe"",=1+2"');
});
test("CSV preserves ordinary reporting values and empty fields", () => {
  for (const value of [
    "Synthetic Learner",
    "Course 1",
    80,
    0,
    "2026-09-16",
    "fake-provider",
    "a'b",
  ]) {
    assert.equal(reportingCsvCell(value), `"${value}"`);
  }
  assert.equal(reportingCsvCell(null), '""');
  assert.equal(reportingCsvCell(undefined), '""');
});
