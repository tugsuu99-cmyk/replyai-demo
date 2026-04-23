export type CsvRow = Record<string, string>;

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
  errors: string[];
};

function dedupeHeaders(headers: string[]) {
  const seen = new Map<string, number>();

  return headers.map((header, index) => {
    const trimmed = header.trim() || `Column ${index + 1}`;
    const count = seen.get(trimmed) ?? 0;
    seen.set(trimmed, count + 1);
    return count === 0 ? trimmed : `${trimmed} (${count + 1})`;
  });
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  rows.push(row);

  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

export function parseCsv(text: string): ParsedCsv {
  const parsedRows = parseCsvRows(text);

  if (parsedRows.length === 0) {
    return {
      headers: [],
      rows: [],
      errors: ["The file did not contain any CSV rows."]
    };
  }

  const headers = dedupeHeaders(parsedRows[0]);
  const errors: string[] = [];

  const rows = parsedRows.slice(1).map((cells, rowIndex) => {
    if (cells.length !== headers.length) {
      errors.push(
        `Row ${rowIndex + 2} has ${cells.length} cells but the header has ${headers.length}. Missing cells were left blank.`
      );
    }

    return headers.reduce<CsvRow>((row, header, headerIndex) => {
      row[header] = (cells[headerIndex] ?? "").trim();
      return row;
    }, {});
  });

  return { headers, rows, errors };
}

function escapeCsvValue(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function stringifyCsv(headers: string[], rows: CsvRow[]) {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(","))
  ];

  return lines.join("\n");
}
