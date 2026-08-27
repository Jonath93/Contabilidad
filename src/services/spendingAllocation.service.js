const { toNumber } = require("./formatters");

const DEFAULT_ALLOCATIONS = [
  { label: "Botanas / gasto libre", percentage: 40, sortOrder: 0 },
  { label: "Guardar casa", percentage: 20, sortOrder: 1 },
  { label: "Guardar boda", percentage: 20, sortOrder: 2 },
  { label: "Guardar salud", percentage: 20, sortOrder: 3 }
];

function normalizeAllocations(allocations) {
  const source = allocations?.length ? allocations : DEFAULT_ALLOCATIONS;

  return source
    .map((allocation, index) => ({
      label: String(allocation.label || "").trim(),
      percentage: toNumber(allocation.percentage),
      sortOrder: Number.isFinite(Number(allocation.sortOrder)) ? Number(allocation.sortOrder) : index
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function buildSpendingSummary(balance, allocations) {
  const available = toNumber(balance);
  const normalized = normalizeAllocations(allocations);

  return {
    available,
    items: available > 0
      ? normalized.map((allocation) => ({
          label: allocation.label,
          percent: allocation.percentage,
          amount: available * (allocation.percentage / 100)
        }))
      : []
  };
}

module.exports = {
  DEFAULT_ALLOCATIONS,
  buildSpendingSummary,
  normalizeAllocations
};
