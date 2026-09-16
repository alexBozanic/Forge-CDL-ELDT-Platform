"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { recordLessonInteraction } from "./actions";
import { lessonSaveFailure } from "@/lib/lesson-interaction";

export function LessonInteractions({
  enrollmentId,
  lessonId,
  positions,
  coursePath,
}: {
  enrollmentId: string;
  lessonId: string;
  positions: number[];
  coursePath: string;
}) {
  const openedKey = useRef(globalThis.crypto.randomUUID());
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState<{ message: string } | null>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const requestKeys = useRef(new Map<string, string>());
  const manualSave = useRef(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (failure) errorSummary.current?.focus();
  }, [failure]);
  useEffect(() => {
    let active = true;
    function showOpenFailure() {
      if (active && !manualSave.current)
        setMessage(
          "The lesson opened, but the interaction could not be recorded. Your lesson remains available.",
        );
    }
    void recordLessonInteraction(
      enrollmentId,
      lessonId,
      "opened",
      0,
      openedKey.current,
    )
      .then((result) => {
        if (!result.saved) showOpenFailure();
      })
      .catch(showOpenFailure);
    return () => {
      active = false;
    };
  }, [enrollmentId, lessonId]);
  function record(type: "position_saved" | "completed", position: number) {
    manualSave.current = true;
    const request = `${type}:${position}`;
    const key =
      requestKeys.current.get(request) ?? globalThis.crypto.randomUUID();
    requestKeys.current.set(request, key);
    setFailure(null);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await recordLessonInteraction(
          enrollmentId,
          lessonId,
          type,
          position,
          key,
        );
        if (!result.saved) {
          setFailure({ message: result.error ?? lessonSaveFailure });
          return;
        }
        requestKeys.current.delete(request);
        setMessage(
          type === "completed"
            ? "Lesson interaction recorded. No course completion was created."
            : "Resume position saved.",
        );
      } catch {
        setFailure({ message: lessonSaveFailure });
      }
    });
  }
  return (
    <div className="interaction-controls" aria-busy={pending}>
      {failure ? (
        <p ref={errorSummary} tabIndex={-1} role="alert" className="form-error">
          {failure.message} <a href={coursePath}>Check course progress</a>
        </p>
      ) : null}
      {positions.map((position) => (
        <button
          className="text-button"
          disabled={pending}
          key={position}
          onClick={() => record("position_saved", position)}
        >
          Save resume point {position + 1}
        </button>
      ))}
      <button
        className="button"
        disabled={pending}
        onClick={() => record("completed", Math.max(positions.length - 1, 0))}
      >
        {pending ? "Saving…" : "Mark lesson interaction complete"}
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
