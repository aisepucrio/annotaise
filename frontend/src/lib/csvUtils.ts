export function isCsvFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.csv');
}

// Splits CSV content into rows while preserving commas and line breaks inside quoted values.
export function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (char === '"') {
      const nextChar = content[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1;
      }
      cells.push(current);
      rows.push(cells);
      cells = [];
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  rows.push(cells);
  return rows;
}

// Checks whether a CSV file contains missing values in any non-empty data row.
export async function csvFileHasEmptyFields(file: File): Promise<boolean> {
  const content = await file.text();
  const rows = parseCsvRows(content).filter((cells) => !(cells.length === 1 && cells[0].trim() === ''));

  if (rows.length <= 1) {
    return false;
  }

  const headers = rows[0];

  return rows.slice(1).some((cells) => {
    if (cells.length < headers.length) return true;
    return cells.some((cell) => cell.trim() === '');
  });
}
