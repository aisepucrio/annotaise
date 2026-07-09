
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "-")
    .replace(/[!-,./:-@[-^`{-~]/g, ""); 
}


export function extractToc(markdown, { min = 2, max = 5 } = {}) {
  const headings = [];
  let insideCodeFence = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      insideCodeFence = !insideCodeFence;
      continue;
    }
    if (insideCodeFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    if (level < min || level > max) continue;

    const text = match[2].replace(/[*_`]/g, "");
    headings.push({ level, text, id: slugify(text) });
  }

  return headings;
}