/**
 * generateReport.js
 * Captures the map and compiles a rich multi-page PDF report
 * using html2canvas + jsPDF.
 */
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function tempColor(tempC) {
  if (tempC > 40) return [255, 59, 59];
  if (tempC > 36) return [255, 119, 34];
  return [255, 215, 0];
}

function classifyUHI(lst) {
  if (lst > 40) return 'Critical';
  if (lst > 36) return 'High';
  if (lst > 32) return 'Moderate';
  return 'Low';
}

// ─── Layout constants ────────────────────────────────────────────────────────

const PAGE_W = 210;  // A4 mm
const PAGE_H = 297;
const MARGIN = 16;
const COL_W  = PAGE_W - MARGIN * 2;

// ─── Drawing sub-functions ───────────────────────────────────────────────────

function drawHeader(doc, pos, timestamp) {
  // Deep-space background
  doc.setFillColor(5, 10, 20);
  doc.rect(0, 0, PAGE_W, 42, 'F');

  // Accent stripe
  doc.setFillColor(0, 242, 255);
  doc.rect(0, 0, 4, 42, 'F');

  // Logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('UHIS', MARGIN + 4, 16);
  doc.setFontSize(9);
  doc.setTextColor(0, 242, 255);
  doc.setFont('helvetica', 'normal');
  doc.text('URBAN HEAT INTELLIGENCE SYSTEM', MARGIN + 4, 23);

  // Report metadata top-right
  doc.setFontSize(8);
  doc.setTextColor(100, 130, 160);
  doc.text([
    `Generated: ${timestamp}`,
    pos ? `Coordinates: ${pos.lat.toFixed(5)}° N  ·  ${Math.abs(pos.lng).toFixed(5)}° ${pos.lng < 0 ? 'W' : 'E'}` : '',
    'Analysis Radius: 1 km',
  ].filter(Boolean), PAGE_W - MARGIN, 14, { align: 'right' });

  // Divider line
  doc.setDrawColor(0, 242, 255, 0.3);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 42, PAGE_W - MARGIN, 42);
}

function sectionTitle(doc, text, y, accentColor = [0, 242, 255]) {
  doc.setFillColor(...accentColor);
  doc.rect(MARGIN, y, 3, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...accentColor);
  doc.text(text.toUpperCase(), MARGIN + 7, y + 4);
  doc.setDrawColor(...accentColor, 0.2);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 7, y + 6, PAGE_W - MARGIN, y + 6);
  return y + 12;
}

function metricCard(doc, x, y, w, h, label, value, unit, color) {
  // card bg
  doc.setFillColor(14, 26, 40);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...color, 0.3);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');
  // label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 130, 160);
  doc.text(label.toUpperCase(), x + w / 2, y + 6, { align: 'center' });
  // value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...color);
  doc.text(`${value}`, x + w / 2, y + 16, { align: 'center' });
  // unit
  doc.setFontSize(7);
  doc.setTextColor(100, 130, 160);
  doc.text(unit, x + w / 2, y + 22, { align: 'center' });
}

function progressBar(doc, x, y, w, pct, color, label, valLabel) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text(label, x, y + 4);
  doc.setTextColor(...color);
  doc.text(valLabel, x + w, y + 4, { align: 'right' });

  // Track
  doc.setFillColor(20, 34, 52);
  doc.roundedRect(x, y + 6, w, 3, 1, 1, 'F');
  // Fill
  const fw = Math.max((pct / 100) * w, 2);
  doc.setFillColor(...color);
  doc.roundedRect(x, y + 6, fw, 3, 1, 1, 'F');

  return y + 14;
}

function hotspotRow(doc, x, y, w, hotspot, idx) {
  const bg = idx % 2 === 0 ? [10, 20, 34] : [14, 26, 42];
  doc.setFillColor(...bg);
  doc.rect(x, y, w, 9, 'F');

  const [r, g, b] = tempColor(hotspot.temp);
  // rank
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 130, 160);
  doc.text(`#${idx + 1}`, x + 3, y + 6);
  // name
  doc.setTextColor(210, 230, 255);
  doc.text(hotspot.name, x + 12, y + 6);
  // coords
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 130, 160);
  doc.text(`${hotspot.lat.toFixed(3)}°N · ${Math.abs(hotspot.lng || hotspot.lon || 0).toFixed(3)}°W`, x + 65, y + 6);
  // temp
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(r, g, b);
  doc.text(`${hotspot.temp.toFixed(1)}°C`, x + w - 3, y + 6, { align: 'right' });
  return y + 9;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateReport({ pos, analysis, mlData, hotspots, layers }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const env  = mlData?.environmental_data ?? analysis?.environmental_data;
  const ana  = analysis?.analysis;
  const ml   = mlData;
  const lst  = env?.lst_celsius ?? 0;
  const ndvi = env?.ndvi ?? 0;
  const ndbi = env?.ndbi ?? 0;
  const [lr, lg, lb] = tempColor(lst);

  /***  PAGE 1  ──────────────────────────────────────────────────────────── ***/
  doc.setFillColor(5, 10, 20);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  drawHeader(doc, pos, timestamp);

  let y = 50;

  // ── Map Screenshot ────────────────────────────────────────────────────────
  y = sectionTitle(doc, 'Map Overview', y);

  const mapEl = document.querySelector('.map-container');
  if (mapEl) {
    try {
      const canvas = await html2canvas(mapEl, {
        useCORS: true,
        allowTaint: true,
        scale: 1.5,
        backgroundColor: '#050a14',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const aspect  = canvas.height / canvas.width;
      const imgW    = COL_W;
      const imgH    = Math.min(imgW * aspect, 70);

      // thin neon border
      doc.setDrawColor(0, 242, 255);
      doc.setLineWidth(0.4);
      doc.roundedRect(MARGIN - 0.5, y - 0.5, imgW + 1, imgH + 1, 2, 2, 'S');
      doc.addImage(imgData, 'JPEG', MARGIN, y, imgW, imgH);
      y += imgH + 6;
    } catch (e) {
      console.warn('Map capture failed:', e);
      doc.setFillColor(12, 24, 38);
      doc.roundedRect(MARGIN, y, COL_W, 30, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 130, 160);
      doc.text('[ Map capture unavailable — CORS restriction ]', MARGIN + COL_W / 2, y + 16, { align: 'center' });
      y += 36;
    }
  }

  // ── Thermal Metrics ───────────────────────────────────────────────────────
  y = sectionTitle(doc, 'Thermal Analysis', y, [lr, lg, lb]);

  if (env) {
    const cardW = (COL_W - 8) / 3;
    const classif = ana?.heat_classification ?? classifyUHI(lst);

    metricCard(doc, MARGIN,               y, cardW, 28, 'Surface Temp',   `${lst.toFixed(1)}`,   '°C — ' + classif,    [lr, lg, lb]);
    metricCard(doc, MARGIN + cardW + 4,   y, cardW, 28, 'Vegetation NDVI', ndvi.toFixed(2),       ana?.vegetation_level ?? '',  [0, 230, 118]);
    metricCard(doc, MARGIN + (cardW + 4) * 2, y, cardW, 28, 'Urban NDBI',  ndbi.toFixed(2),       ana?.urban_density ?? '',     [255, 215, 0]);
    y += 34;
  }

  // ── ML Intelligence ───────────────────────────────────────────────────────
  if (ml) {
    y = sectionTitle(doc, 'ML Model Intelligence', y, [167, 139, 250]);
    const prob  = (ml.uhi_probability ?? 0) * 100;
    const score = (ml.uhi_score ?? 0)       * 100;
    const conf  = ml.model_confidence ?? 'medium';
    const confC = conf === 'high' ? [0, 230, 118] : conf === 'medium' ? [255, 215, 0] : [255, 119, 34];

    // confidence badge
    doc.setFillColor(...confC, 0.15);
    doc.roundedRect(MARGIN, y, 40, 7, 1, 1, 'F');
    doc.setDrawColor(...confC);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y, 40, 7, 1, 1, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...confC);
    doc.text(`${conf.toUpperCase()} CONFIDENCE`, MARGIN + 20, y + 4.5, { align: 'center' });
    y += 10;

    y = progressBar(doc, MARGIN, y, COL_W, prob,  [255, 59, 59],    'UHI Probability',   `${prob.toFixed(1)}%`);
    y = progressBar(doc, MARGIN, y, COL_W, score, [167, 139, 250],  'UHI Severity Score', `${score.toFixed(0)}/100`);
    y += 4;

    // predicted vs actual mini-cards
    if (ml.predicted_temperature != null && ml.environmental_data?.lst_celsius != null) {
      const hw = (COL_W - 6) / 2;
      metricCard(doc, MARGIN,         y, hw, 22, 'Actual LST (Landsat)',   `${ml.environmental_data.lst_celsius.toFixed(1)}`, '°C', [255, 59, 59]);
      metricCard(doc, MARGIN + hw + 6, y, hw, 22, 'ML Predicted',           `${ml.predicted_temperature.toFixed(1)}`,          '°C — RF Regressor', [167, 139, 250]);
      y += 28;
    }
  }

  // ── UHI Causes ───────────────────────────────────────────────────────────
  if (ana?.causes?.length) {
    y = sectionTitle(doc, 'Detected UHI Causes', y, [255, 119, 34]);
    ana.causes.forEach((c, i) => {
      doc.setFillColor(14, 26, 40);
      doc.roundedRect(MARGIN, y, COL_W, 16, 2, 2, 'F');
      doc.setDrawColor(255, 119, 34, 0.3);
      doc.setLineWidth(0.2);
      doc.rect(MARGIN, y, 2, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 240, 255);
      doc.text(c.label, MARGIN + 6, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 130, 160);
      const lines = doc.splitTextToSize(c.description, COL_W - 10);
      doc.text(lines[0], MARGIN + 6, y + 12);
      y += 20;

      if (y > PAGE_H - 30) { doc.addPage(); doc.setFillColor(5,10,20); doc.rect(0,0,PAGE_W,PAGE_H,'F'); y = 16; }
    });
  }

  /***  PAGE 2  ──────────────────────────────────────────────────────────── ***/
  doc.addPage();
  doc.setFillColor(5, 10, 20);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  drawHeader(doc, pos, timestamp);
  y = 50;

  // ── Hotspots Ranking ─────────────────────────────────────────────────────
  y = sectionTitle(doc, `Active Hotspots (${hotspots.length})`, y, [255, 59, 59]);

  // table header
  doc.setFillColor(0, 242, 255, 0.08);
  doc.rect(MARGIN, y, COL_W, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 242, 255);
  doc.text(['#', 'Location', 'Coordinates', 'LST (°C)'].join('   '), MARGIN + 3, y + 5);
  y += 8;

  hotspots.forEach((h, i) => {
    if (y > PAGE_H - 20) { doc.addPage(); doc.setFillColor(5,10,20); doc.rect(0,0,PAGE_W,PAGE_H,'F'); drawHeader(doc, pos, timestamp); y = 50; }
    y = hotspotRow(doc, MARGIN, y, COL_W, h, i);
  });
  y += 8;

  // ── Recommendations ───────────────────────────────────────────────────────
  if (ana?.recommendations?.length) {
    y = sectionTitle(doc, 'Mitigation Recommendations', y, [0, 230, 118]);

    ana.recommendations.forEach((rec, i) => {
      if (y > PAGE_H - 40) { doc.addPage(); doc.setFillColor(5,10,20); doc.rect(0,0,PAGE_W,PAGE_H,'F'); drawHeader(doc, pos, timestamp); y = 50; }
      doc.setFillColor(10, 22, 36);
      doc.roundedRect(MARGIN, y, COL_W, 26, 2, 2, 'F');
      doc.setDrawColor(0, 230, 118, 0.25);
      doc.setLineWidth(0.2);
      doc.roundedRect(MARGIN, y, COL_W, 26, 2, 2, 'S');
      // rank circle
      doc.setFillColor(0, 230, 118, 0.12);
      doc.circle(MARGIN + 8, y + 9, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 230, 118);
      doc.text(`${i + 1}`, MARGIN + 8, y + 12, { align: 'center' });
      // action
      doc.setFontSize(8.5);
      doc.setTextColor(220, 240, 255);
      doc.text(rec.action, MARGIN + 16, y + 7);
      // explanation
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 130, 160);
      const lines = doc.splitTextToSize(rec.explanation, COL_W - 22);
      doc.text(lines.slice(0, 2), MARGIN + 16, y + 14);
      // impact badge
      if (rec.impact_celsius) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 230, 118);
        doc.text(`↓ ${rec.impact_celsius}°C reduction`, PAGE_W - MARGIN - 3, y + 22, { align: 'right' });
      }
      y += 30;
    });
  }

  // ── Estimated Total Reduction ─────────────────────────────────────────────
  if (ana?.estimated_reduction_celsius) {
    if (y > PAGE_H - 40) { doc.addPage(); doc.setFillColor(5,10,20); doc.rect(0,0,PAGE_W,PAGE_H,'F'); y = 20; }
    doc.setFillColor(0, 242, 255, 0.06);
    doc.roundedRect(MARGIN, y, COL_W, 20, 3, 3, 'F');
    doc.setDrawColor(0, 242, 255, 0.4);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y, COL_W, 20, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 242, 255);
    doc.text('Estimated Total Cooling Potential:', MARGIN + 8, y + 9);
    doc.setFontSize(16);
    doc.setTextColor(0, 230, 118);
    doc.text(`↓ ${ana.estimated_reduction_celsius.toFixed(1)}°C`, PAGE_W - MARGIN - 8, y + 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 130, 160);
    doc.text('Combined impact if all recommended interventions are applied simultaneously', MARGIN + 8, y + 16);
    y += 28;
  }

  // ── Footer on last page ───────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(5, 10, 20);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F');
    doc.setDrawColor(0, 242, 255, 0.2);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 110, 140);
    doc.text('UHIS · Urban Heat Intelligence System · Confidential Analysis Report', MARGIN, PAGE_H - 4);
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const filename = pos
    ? `UHIS_Report_${pos.lat.toFixed(3)}N_${Math.abs(pos.lng).toFixed(3)}W_${Date.now()}.pdf`
    : `UHIS_Report_${Date.now()}.pdf`;
  doc.save(filename);
}
