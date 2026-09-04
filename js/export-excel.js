/*
 * Excel export for the visible Team Activity Log table.
 * Uses SheetJS loaded by index.html; no Firebase read is performed here.
 */

const exportButton = document.getElementById("exportExcelBtn");

function getFilePart(value = "") {
  return String(value)
    .trim()
    .replace(/[^a-z0-9\-_]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "data";
}

function getCurrentContext() {
  const variant = String(localStorage.getItem("itgh.variant") || "A").toUpperCase();
  const week = Number(localStorage.getItem("itgh.week") || 1);
  return { variant, week };
}

function exportTableToExcel() {
  if (!window.XLSX) {
    window.alert("Fitur Excel belum siap. Silakan refresh halaman lalu coba lagi.");
    return;
  }

  const table = document.getElementById("challengeRecordTable");
  if (!table) return;

  const { variant, week } = getCurrentContext();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.table_to_sheet(table, { raw: true });

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 20 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Challenge Record");

  const filename = `ITGH-Bingo-2026-Bingo-${getFilePart(variant)}-Week-${getFilePart(week)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

exportButton?.addEventListener("click", exportTableToExcel);
