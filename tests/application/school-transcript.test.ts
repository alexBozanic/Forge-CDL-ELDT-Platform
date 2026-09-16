import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSchoolTranscript } from "../../src/lib/school-transcript.ts";

function fixture(failure?: string) {
  const rpcCalls: unknown[] = [];
  const transcript = { completion: { id: "completion-a" } };
  const rows: Record<string, Record<string, string>[]> = {
    organizations: [
      { id: "school-a", slug: "alpha" },
      { id: "school-b", slug: "beta" },
    ],
    course_completions: [{ id: "completion-a", organization_id: "school-a" }],
  };
  const client = {
    from(table: string) {
      let selected = rows[table];
      return {
        select() {
          return this;
        },
        eq(field: string, value: string) {
          selected = selected.filter((row) => row[field] === value);
          return this;
        },
        async single() {
          return {
            data: selected.length === 1 ? selected[0] : null,
            error: failure === table ? { message: "private details" } : null,
          };
        },
      };
    },
    async rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args });
      return {
        data: transcript,
        error: failure === "rpc" ? { message: "private details" } : null,
      };
    },
  } as unknown as SupabaseClient;
  return { client, rpcCalls, transcript };
}

test("a globally visible completion cannot be read through another school", async () => {
  const { client, rpcCalls } = fixture();
  assert.equal(
    await loadSchoolTranscript(client, "beta", "completion-a"),
    null,
  );
  assert.deepEqual(rpcCalls, []);
});

test("the owning school's route loads the authorized transcript", async () => {
  const { client, rpcCalls, transcript } = fixture();
  assert.deepEqual(
    await loadSchoolTranscript(client, "alpha", "completion-a"),
    transcript,
  );
  assert.deepEqual(rpcCalls, [
    {
      name: "get_training_transcript",
      args: { target_completion_id: "completion-a" },
    },
  ]);
});

test("missing school or completion does not invoke the transcript RPC", async () => {
  for (const [slug, id] of [
    ["missing", "completion-a"],
    ["alpha", "missing"],
  ]) {
    const { client, rpcCalls } = fixture();
    assert.equal(await loadSchoolTranscript(client, slug, id), null);
    assert.deepEqual(rpcCalls, []);
  }
});

test("lookup and RPC failures fail closed without exposing private errors", async () => {
  for (const failure of ["organizations", "course_completions", "rpc"]) {
    const { client, rpcCalls } = fixture(failure);
    assert.equal(
      await loadSchoolTranscript(client, "alpha", "completion-a"),
      null,
    );
    assert.equal(rpcCalls.length, failure === "rpc" ? 1 : 0);
  }
});
