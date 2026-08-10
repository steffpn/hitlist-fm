import PDFDocument from "pdfkit";
import type { EventSummary } from "./query.js";

interface DateRange {
  startDate: string;
  endDate: string;
}

const PAGE_WIDTH = 495; // A4 width minus margins
const PAGE_BOTTOM = 750;

/**
 * Build a branded PDF airplay report from an aggregated summary.
 *
 * The report is deliberately *not* a dump of every detection. A month of two
 * monitored stations is tens of thousands of rows — which is what used to trip
 * the 1,000-row cap and fail the export outright — but only a few hundred
 * distinct songs. Aggregating by song keeps the report readable and removes the
 * cap entirely; the full row-level data stays available as CSV.
 *
 * Uses PDFKit with the built-in Helvetica fonts (no external font files).
 *
 * Layout:
 * - Header: hitlist.fm brand + "Airplay Report", date range, meta
 * - Summary: total plays, unique songs, stations
 * - Table: plays per station
 * - Table: every song by plays, with its per-station breakdown
 * - Footer: brand text centered on each page
 */
export async function buildPDFBuffer(
  summary: EventSummary,
  dateRange: DateRange,
  userName: string,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
    info: {
      Title: `Airplay Report ${dateRange.startDate} to ${dateRange.endDate}`,
      Author: "hitlist.fm",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // --- Header ---
  doc.fontSize(22).font("Helvetica-Bold").text("hitlist.fm", { align: "left" });
  doc.fontSize(16).font("Helvetica").text("Airplay Report", { align: "left" });
  doc.moveDown(0.5);

  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`${dateRange.startDate}  -  ${dateRange.endDate}`, { align: "left" });
  doc.moveDown(0.3);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#666666")
    .text(`Generated for: ${userName}`)
    .text(`Generated: ${new Date().toISOString().split("T")[0]}`);
  doc.moveDown(0.5);

  // --- Summary ---
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text(
      `${summary.totalPlays} plays  |  ${summary.uniqueSongs} unique songs  |  ${summary.stations.length} stations`,
    );
  doc.moveDown(1);

  // --- Plays per station ---
  if (summary.stations.length > 0) {
    doc.fontSize(12).font("Helvetica-Bold").text("Plays per station");
    doc.moveDown(0.4);

    let y = drawHeader(doc, doc.y, [340, 155], ["Station", "Plays"]);
    for (const station of summary.stations) {
      y = ensureRoom(doc, y, [340, 155], ["Station", "Plays"]);
      drawTableRow(doc, y, [340, 155], [truncate(station.name, 55), String(station.plays)], false);
      y = advance(doc, y);
    }
    doc.y = y;
    doc.moveDown(1);
  }

  // --- Songs, with per-station breakdown ---
  const songCols = [150, 115, 95, 40, 95];
  const songHeaders = ["Song", "Artist", "ISRC", "Plays", "By station"];

  doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("Songs");
  doc.moveDown(0.4);

  if (summary.songs.length === 0) {
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text("No plays in this period.");
  } else {
    let y = drawHeader(doc, doc.y, songCols, songHeaders);
    for (const song of summary.songs) {
      y = ensureRoom(doc, y, songCols, songHeaders);
      drawTableRow(
        doc,
        y,
        songCols,
        [
          truncate(song.songTitle, 28),
          truncate(song.artistName, 22),
          song.isrc ?? "",
          String(song.plays),
          truncate(song.byStation.map((s) => `${s.name} ${s.plays}`).join(", "), 22),
        ],
        false,
      );
      y = advance(doc, y);
    }
    doc.y = y;
  }

  // --- Footer on all pages ---
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#999999")
      .text("hitlist.fm - Airplay Monitoring", 50, 780, {
        align: "center",
        width: PAGE_WIDTH,
      });
  }

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/** Draw a header row plus its underline; returns the y of the first data row. */
function drawHeader(
  doc: PDFKit.PDFDocument,
  y: number,
  colWidths: number[],
  headers: string[],
): number {
  drawTableRow(doc, y, colWidths, headers, true);
  doc
    .moveTo(50, y + 18)
    .lineTo(50 + PAGE_WIDTH, y + 18)
    .strokeColor("#999999")
    .lineWidth(0.5)
    .stroke();
  return y + 22;
}

/** Break to a new page (repeating the header) when the current row would overflow. */
function ensureRoom(
  doc: PDFKit.PDFDocument,
  y: number,
  colWidths: number[],
  headers: string[],
): number {
  if (y <= PAGE_BOTTOM) return y;
  doc.addPage();
  return drawHeader(doc, 50, colWidths, headers);
}

/** Move past the row just drawn, leaving a hairline separator. */
function advance(doc: PDFKit.PDFDocument, y: number): number {
  const next = y + 16;
  doc
    .moveTo(50, next)
    .lineTo(50 + PAGE_WIDTH, next)
    .strokeColor("#eeeeee")
    .lineWidth(0.25)
    .stroke();
  return next + 4;
}

/**
 * Draw a row of text cells at the given y position.
 */
function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  colWidths: number[],
  cells: string[],
  isHeader: boolean,
): void {
  let x = 50;
  const fontSize = isHeader ? 9 : 8;
  const font = isHeader ? "Helvetica-Bold" : "Helvetica";

  doc.fontSize(fontSize).font(font).fillColor("#000000");

  for (let i = 0; i < cells.length; i++) {
    doc.text(cells[i], x, y, {
      width: colWidths[i],
      lineBreak: false,
    });
    x += colWidths[i];
  }
}

/**
 * Truncate a string to maxLen characters, appending "..." if needed.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}
