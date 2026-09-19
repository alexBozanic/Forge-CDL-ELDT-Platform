export function markdownBlocks(markdown: string) {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function inlineText(text: string) {
  // Deliberately limited syntax. React escapes every text segment; raw HTML,
  // images and arbitrary link targets are never interpreted.
  return text
    .split(/(\*\*[^*\n]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
}

export function SafeMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="lesson-content">
      {markdownBlocks(markdown).map((block, index) => {
        const heading = /^(#{1,6}) (.+)$/.exec(block);
        if (heading) {
          // The surrounding page owns h1. Preserve the legacy # -> h2 mapping.
          const title = inlineText(heading[2]);
          switch (heading[1].length) {
            case 1:
            case 2:
              return <h2 key={index}>{title}</h2>;
            case 3:
              return <h3 key={index}>{title}</h3>;
            case 4:
              return <h4 key={index}>{title}</h4>;
            case 5:
              return <h5 key={index}>{title}</h5>;
            default:
              return <h6 key={index}>{title}</h6>;
          }
        }
        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{inlineText(line.slice(2))}</li>
              ))}
            </ul>
          );
        }
        const ordered = lines.map((line) => /^(\d+)\. (.+)$/.exec(line));
        if (ordered.every((line) => line !== null)) {
          return (
            <ol key={index}>
              {ordered.map((line, lineIndex) => (
                <li key={lineIndex} value={Number(line![1])}>
                  {inlineText(line![2])}
                </li>
              ))}
            </ol>
          );
        }
        return <p key={index}>{inlineText(block)}</p>;
      })}
    </div>
  );
}
