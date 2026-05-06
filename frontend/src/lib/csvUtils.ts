// Returns whether a file name has the expected CSV extension.
export function isCsvFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.csv');
}

// Splits a CSV row while preserving commas inside quoted values.
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

// Checks whether a CSV file contains missing values in any non-empty data row.
export async function csvFileHasEmptyFields(file: File): Promise<boolean> {
  const content = await file.text();
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length <= 1) {
    return false;
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).some((line) => {
    const cells = parseCsvLine(line);
    if (cells.length < headers.length) return true;
    return cells.some((cell) => cell.trim() === '');
  });
}
