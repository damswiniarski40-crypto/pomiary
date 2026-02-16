import jsPDF from 'jspdf';
import { calculateChange } from './comparison';

/* ============================
   Palety kolorów per tryb
   ============================ */

const PALETTE = {
  male: {
    accent: [59, 130, 246],      // #3b82f6
    accentLight: [30, 58, 95],   // tło nagłówka tabeli
    headerText: [255, 255, 255],
    text: [241, 245, 249],
    textMuted: [148, 163, 184],
    bg: [10, 14, 26],
    cardBg: [26, 31, 53],
    green: [34, 197, 94],
    red: [239, 68, 68],
    gray: [148, 163, 184],
  },
  female: {
    accent: [139, 92, 246],      // #8b5cf6
    accentLight: [102, 126, 234],
    headerText: [255, 255, 255],
    text: [30, 27, 58],
    textMuted: [107, 99, 148],
    bg: [248, 245, 255],
    cardBg: [239, 232, 255],
    green: [34, 197, 94],
    red: [239, 68, 68],
    gray: [148, 163, 184],
  },
};

/* ============================
   Pomocnicze funkcje rysowania
   ============================ */

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function nowFormatted() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Rysuje kolorowy prostokąt nagłówka z tekstem */
function drawHeader(doc, pal, title, y) {
  doc.setFillColor(...pal.accent);
  doc.rect(15, y, 180, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...pal.headerText);
  doc.text(title, 105, y + 9.5, { align: 'center' });
  return y + 14;
}

/** Rysuje podtytuł sekcji */
function drawSectionTitle(doc, pal, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...pal.accent);
  doc.text(title, 15, y + 5);
  // Linia pod tytułem
  doc.setDrawColor(...pal.accent);
  doc.setLineWidth(0.4);
  doc.line(15, y + 7, 195, y + 7);
  return y + 12;
}

/** Sprawdza czy potrzebna nowa strona, jeśli tak — dodaje i zwraca nowe Y */
function checkPage(doc, y, needed = 20) {
  if (y + needed > 280) {
    doc.addPage();
    return 15;
  }
  return y;
}

/* ============================
   Główna funkcja eksportu
   ============================ */

export function exportPDF({ entries, fields, mode }) {
  if (entries.length === 0) return;

  const pal = PALETTE[mode];
  const modeLabel = mode === 'male' ? 'Mezczyzna' : 'Kobieta';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;

  let y = 15;

  // --- NAGŁÓWEK DOKUMENTU ---
  doc.setFillColor(...pal.accent);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(`Raport pomiarow — ${modeLabel}`, pageW / 2, 13, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Wygenerowano: ${nowFormatted()}`, pageW / 2, 22, { align: 'center' });
  y = 36;

  // --- OSTATNI POMIAR + PORÓWNANIE ---
  y = drawSectionLabel(doc, pal, 'Ostatni pomiar', margin, y, pageW);
  y += 2;

  const latest = entries[0];
  const previous = entries[1] || null;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...pal.text);
  doc.text(`Data: ${formatDate(latest.date)}`, margin, y + 4);
  y += 8;

  // Dwie kolumny: pomiar + zmiana
  const colW = contentW / 3;
  let col = 0;
  let startY = y;

  for (const f of fields) {
    const val = latest[f.key];
    const valStr = val != null ? `${val} ${f.unit}` : '—';
    let changeStr = '';

    if (previous) {
      const ch = calculateChange(val, previous[f.key]);
      if (ch) {
        const arrow = ch.direction === 'up' ? '>' : ch.direction === 'down' ? '<' : '=';
        const sign = ch.diff > 0 ? '+' : '';
        changeStr = ` (${arrow} ${sign}${ch.diff})`;
      }
    }

    const x = margin + col * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...pal.textMuted);
    doc.text(f.label, x, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...pal.text);
    doc.text(valStr, x + 0.5, y + 9);

    if (changeStr) {
      const ch = calculateChange(val, previous?.[f.key]);
      if (ch) {
        const color = ch.direction === 'up' ? pal.red : ch.direction === 'down' ? pal.green : pal.gray;
        doc.setTextColor(...color);
        doc.text(changeStr, x + doc.getTextWidth(valStr) + 1.5, y + 9);
      }
    }

    col++;
    if (col >= 3) {
      col = 0;
      y += 14;
      y = checkPage(doc, y, 14);
    }
  }
  if (col !== 0) y += 14;

  y += 4;
  y = checkPage(doc, y, 40);

  // --- TABELA HISTORII ---
  y = drawSectionLabel(doc, pal, `Historia pomiarow (${entries.length})`, margin, y, pageW);
  y += 4;

  // Oblicz szerokości kolumn
  const cols = ['Data', ...fields.map((f) => f.label)];
  const dateColW = 22;
  const dataColW = (contentW - dateColW) / fields.length;

  // Nagłówek tabeli
  doc.setFillColor(...pal.accent);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);

  let cx = margin + 1;
  doc.text('Data', cx, y + 5.5);
  cx = margin + dateColW;
  for (const f of fields) {
    doc.text(truncate(f.label, dataColW, doc), cx + 1, y + 5.5);
    cx += dataColW;
  }
  y += 8;

  // Wiersze danych
  const maxRows = Math.min(entries.length, 50); // Limit do 50 wierszy
  for (let i = 0; i < maxRows; i++) {
    y = checkPage(doc, y, 8);

    // Co drugi wiersz — jasne tło
    if (i % 2 === 0) {
      doc.setFillColor(...pal.cardBg);
      doc.rect(margin, y, contentW, 7, 'F');
    }

    const entry = entries[i];
    const prev = entries[i + 1] || null;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...pal.text);

    cx = margin + 1;
    doc.text(formatDate(entry.date), cx, y + 5);
    cx = margin + dateColW;

    for (const f of fields) {
      const val = entry[f.key];
      const valStr = val != null ? `${val}` : '—';

      doc.setTextColor(...pal.text);
      doc.text(valStr, cx + 1, y + 5);

      // Mała zmiana obok wartości
      if (prev) {
        const ch = calculateChange(val, prev[f.key]);
        if (ch && ch.direction !== 'same') {
          const color = ch.direction === 'up' ? pal.red : pal.green;
          const sign = ch.diff > 0 ? '+' : '';
          doc.setFontSize(5.5);
          doc.setTextColor(...color);
          doc.text(`${sign}${ch.diff}`, cx + 1 + doc.getTextWidth(valStr + ' '), y + 5);
          doc.setFontSize(7);
        }
      }

      cx += dataColW;
    }
    y += 7;
  }

  if (entries.length > 50) {
    y += 3;
    doc.setFontSize(7);
    doc.setTextColor(...pal.textMuted);
    doc.text(`... oraz ${entries.length - 50} wiecej wpisow (pominieto w PDF)`, margin, y + 4);
    y += 8;
  }

  y += 6;
  y = checkPage(doc, y, 35);

  // --- PODSUMOWANIE STATYSTYK ---
  y = drawSectionLabel(doc, pal, 'Podsumowanie statystyk', margin, y, pageW);
  y += 4;

  // Oblicz statystyki per pole
  const statsData = [];
  for (const f of fields) {
    const sorted = [...entries].reverse();
    const values = sorted.filter((e) => e[f.key] != null);
    if (values.length < 2) continue;

    let totalDiff = 0;
    let totalDays = 0;
    let maxDrop = 0;
    let maxRise = 0;

    for (let i = 1; i < values.length; i++) {
      const diff = +(values[i][f.key] - values[i - 1][f.key]).toFixed(1);
      const days = (new Date(values[i].date) - new Date(values[i - 1].date)) / (1000 * 60 * 60 * 24);
      if (days > 0) {
        totalDiff += diff;
        totalDays += days;
      }
      if (diff < maxDrop) maxDrop = diff;
      if (diff > maxRise) maxRise = diff;
    }

    const avgWeekly = totalDays > 0 ? +((totalDiff / totalDays) * 7).toFixed(1) : 0;
    const firstVal = values[0][f.key];
    const lastVal = values[values.length - 1][f.key];
    const totalChange = +(lastVal - firstVal).toFixed(1);

    statsData.push({
      label: f.label,
      unit: f.unit,
      avgWeekly,
      maxDrop,
      maxRise,
      totalChange,
    });
  }

  if (statsData.length > 0) {
    // Nagłówek mini-tabeli
    const sCols = ['Pomiar', 'Sr. tyg.', 'Max spadek', 'Max wzrost', 'Laczna zm.'];
    const sColW = contentW / sCols.length;

    doc.setFillColor(...pal.accent);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    sCols.forEach((label, i) => {
      doc.text(label, margin + i * sColW + 2, y + 5);
    });
    y += 7;

    for (let i = 0; i < statsData.length; i++) {
      y = checkPage(doc, y, 7);
      const s = statsData[i];

      if (i % 2 === 0) {
        doc.setFillColor(...pal.cardBg);
        doc.rect(margin, y, contentW, 7, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      // Nazwa
      doc.setTextColor(...pal.text);
      doc.text(s.label, margin + 2, y + 5);

      // Średnia tygodniowa
      const avgColor = s.avgWeekly < 0 ? pal.green : s.avgWeekly > 0 ? pal.red : pal.gray;
      doc.setTextColor(...avgColor);
      doc.text(`${s.avgWeekly > 0 ? '+' : ''}${s.avgWeekly} ${s.unit}`, margin + sColW + 2, y + 5);

      // Max spadek
      doc.setTextColor(...pal.green);
      doc.text(s.maxDrop !== 0 ? `${s.maxDrop} ${s.unit}` : '—', margin + sColW * 2 + 2, y + 5);

      // Max wzrost
      doc.setTextColor(...pal.red);
      doc.text(s.maxRise !== 0 ? `+${s.maxRise} ${s.unit}` : '—', margin + sColW * 3 + 2, y + 5);

      // Łączna zmiana
      const totalColor = s.totalChange < 0 ? pal.green : s.totalChange > 0 ? pal.red : pal.gray;
      doc.setTextColor(...totalColor);
      doc.text(`${s.totalChange > 0 ? '+' : ''}${s.totalChange} ${s.unit}`, margin + sColW * 4 + 2, y + 5);

      y += 7;
    }
  }

  // --- STOPKA ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...pal.textMuted);
    doc.text(
      `Pomiary — raport  |  Strona ${p}/${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  // Zapisz
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`pomiary-${mode}-${dateStr}.pdf`);
}

/* ============================
   Funkcje pomocnicze
   ============================ */

function drawSectionLabel(doc, pal, title, x, y, pageW) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...pal.accent);
  doc.text(title, x, y + 5);
  doc.setDrawColor(...pal.accent);
  doc.setLineWidth(0.3);
  doc.line(x, y + 7, pageW - x, y + 7);
  return y + 10;
}

function truncate(str, maxWidthMm, doc) {
  if (doc.getTextWidth(str) <= maxWidthMm - 2) return str;
  while (str.length > 1 && doc.getTextWidth(str + '..') > maxWidthMm - 2) {
    str = str.slice(0, -1);
  }
  return str + '..';
}
