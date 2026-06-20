const fs = require("fs/promises");
const pdf = require("pdf-parse");

function parseMoney(raw) {
  if (!raw) return null;
  const normalized = raw
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function moneyAmounts(line) {
  const matches = line.match(/\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})|\$?\s*\d+(?:\.\d{2})/g);
  if (!matches) return null;
  return matches.map(parseMoney).filter((value) => value && value > 0);
}

function parseInstallmentInfo(line) {
  const fraction = line.match(/(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})/i);
  if (fraction) {
    const currentInstallment = Number(fraction[1]);
    const totalMonths = Number(fraction[2]);
    return {
      currentInstallment,
      totalMonths,
      remainingMonths: Math.max(totalMonths - currentInstallment + 1, 1)
    };
  }

  const months = line.match(/(\d{1,2})\s*(?:MSI|MENS|MESES|MENSUALIDADES)/i);
  if (months) {
    const totalMonths = Number(months[1]);
    return {
      currentInstallment: null,
      totalMonths,
      remainingMonths: totalMonths
    };
  }

  return {
    currentInstallment: null,
    totalMonths: null,
    remainingMonths: null
  };
}

function looksLikeInstallment(line) {
  return /MSI|\bMENS\b|MESES SIN INTERESES|MENSUALIDAD|MENSUALIDADES|PARCIALIDAD|COMPRA A MESES|PROMOCION|PROMOCI.N/i.test(line);
}

function cleanDescription(line) {
  return line
    .replace(/\s+/g, " ")
    .replace(/\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})/g, "")
    .trim()
    .slice(0, 160);
}

function detectInstallments(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = [];

  for (const line of lines) {
    if (!looksLikeInstallment(line)) continue;

    const amounts = moneyAmounts(line);
    const monthlyAmount = amounts?.length ? amounts[amounts.length - 1] : null;
    if (!monthlyAmount) continue;

    const info = parseInstallmentInfo(line);
    const detectedTotal = amounts.length > 1 ? amounts[0] : null;
    const inferredRemainingMonths = detectedTotal ? Math.max(Math.ceil(detectedTotal / monthlyAmount), 1) : null;
    const remainingMonths = info.currentInstallment
      ? info.remainingMonths
      : inferredRemainingMonths || info.remainingMonths;

    candidates.push({
      description: cleanDescription(line) || line.slice(0, 160),
      monthlyAmount,
      totalAmount: detectedTotal || (info.totalMonths ? monthlyAmount * info.totalMonths : null),
      totalMonths: info.totalMonths,
      currentInstallment: info.currentInstallment,
      remainingMonths,
      isInterestFree: /MSI|SIN INTERESES|0%\s*INT/i.test(line),
      rawLine: line
    });
  }

  return candidates;
}

async function parsePdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await pdf(buffer);
  const text = result.text || "";

  return {
    text,
    candidates: detectInstallments(text)
  };
}

module.exports = {
  detectInstallments,
  parsePdf
};
