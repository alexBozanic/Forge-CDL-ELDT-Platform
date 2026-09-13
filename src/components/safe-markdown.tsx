export function markdownBlocks(markdown: string) {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function SafeMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="lesson-content">
      {markdownBlocks(markdown).map((block, index) => {
        if (block.startsWith("# "))
          return <h2 key={index}>{block.slice(2)}</h2>;
        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block}</p>;
      })}
    </div>
  );
}
