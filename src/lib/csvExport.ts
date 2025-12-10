export const convertToCSV = <T extends object>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string => {
  if (data.length === 0) return "";

  const headers = columns.map((col) => col.header).join(",");
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
};

export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
