"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { recordLessonInteraction } from "./actions";

export function LessonInteractions({
  enrollmentId,
  lessonId,
  positions,
}: {
  enrollmentId: string;
  lessonId: string;
  positions: number[];
}) {
  const openedKey = useRef(globalThis.crypto.randomUUID());
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    void recordLessonInteraction(
      enrollmentId,
      lessonId,
      "opened",
      0,
      openedKey.current,
    ).catch(() =>
      setMessage(
        "The lesson opened, but the interaction could not be recorded.",
      ),
    );
  }, [enrollmentId, lessonId]);
  function record(type: "position_saved" | "completed", position: number) {
    const key = globalThis.crypto.randomUUID();
    startTransition(async () => {
      await recordLessonInteraction(
        enrollmentId,
        lessonId,
        type,
        position,
        key,
      );
      setMessage(
        type === "completed"
          ? "Lesson interaction recorded. No course completion was created."
          : "Resume position saved.",
      );
    });
  }
  return (
    <div className="interaction-controls">
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
