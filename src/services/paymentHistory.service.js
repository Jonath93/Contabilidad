const dayjs = require("dayjs");

const prisma = require("../config/prisma");
const { buildProjection } = require("./paymentProjection.service");
const { toNumber } = require("./formatters");
const { buildSpendingSummary, normalizeAllocations } = require("./spendingAllocation.service");

const HISTORY_START = dayjs("2026-06-01").startOf("month");

function getPeriodKey(periodDate) {
  return dayjs(periodDate).format("YYYY-MM");
}

function isPeriodClosed(periodEnd, today = new Date()) {
  return dayjs(today).startOf("day").isAfter(dayjs(periodEnd).startOf("day"));
}

function getTrackablePeriodDates(today = new Date(), includeCurrent = true) {
  const lastPeriod = dayjs(today).startOf("month").subtract(includeCurrent ? 0 : 1, "month");

  if (lastPeriod.isBefore(HISTORY_START, "month")) return [];

  const count = lastPeriod.diff(HISTORY_START, "month") + 1;
  return Array.from({ length: count }, (_, index) => HISTORY_START.add(index, "month").toDate());
}

function snapshotDataFromProjection(projection, closed) {
  const items = projection.buckets.flatMap((bucket) =>
    bucket.items.map((item) => ({
      debtId: item.id,
      bucketKey: bucket.key,
      paymentDate: bucket.date,
      paymentDay: bucket.day,
      paymentLabel: bucket.label,
      debtName: item.name,
      cardName: item.cardName,
      amount: item.amount,
      isRecurring: item.isRecurring,
      progressLabel: item.progress.label,
      remainingLabel: item.progress.remainingLabel
    }))
  );

  return {
    periodStart: projection.targets[0].date,
    periodEnd: projection.targets[projection.targets.length - 1].date,
    periodLabel: projection.periodLabel,
    income: projection.income,
    currency: projection.currency,
    totalToPay: projection.totalToPay,
    balance: projection.balance,
    isClosed: closed,
    items,
    allocations: projection.spendingAllocations
  };
}

async function syncPeriod(periodDate, debts, profile, today = new Date()) {
  const periodKey = getPeriodKey(periodDate);
  const existing = await prisma.paymentPeriodSnapshot.findUnique({ where: { periodKey } });

  if (existing?.isClosed) return existing;

  const projection = buildProjection(
    debts.map((debt) => ({ ...debt, isPaidOff: false })),
    profile,
    periodDate
  );
  const closed = isPeriodClosed(projection.targets[projection.targets.length - 1].date, today);

  if (existing && closed) {
    return prisma.paymentPeriodSnapshot.update({
      where: { id: existing.id },
      data: { isClosed: true }
    });
  }

  const snapshot = snapshotDataFromProjection(projection, closed);

  return prisma.$transaction(async (tx) => {
    const period = existing
      ? await tx.paymentPeriodSnapshot.update({
          where: { id: existing.id },
          data: {
            periodStart: snapshot.periodStart,
            periodEnd: snapshot.periodEnd,
            periodLabel: snapshot.periodLabel,
            income: snapshot.income,
            currency: snapshot.currency,
            totalToPay: snapshot.totalToPay,
            balance: snapshot.balance,
            isClosed: snapshot.isClosed
          }
        })
      : await tx.paymentPeriodSnapshot.create({
          data: {
            periodKey,
            periodStart: snapshot.periodStart,
            periodEnd: snapshot.periodEnd,
            periodLabel: snapshot.periodLabel,
            income: snapshot.income,
            currency: snapshot.currency,
            totalToPay: snapshot.totalToPay,
            balance: snapshot.balance,
            isClosed: snapshot.isClosed
          }
        });

    await tx.paymentPeriodSnapshotItem.deleteMany({ where: { periodSnapshotId: period.id } });
    if (snapshot.items.length) {
      await tx.paymentPeriodSnapshotItem.createMany({
        data: snapshot.items.map((item) => ({ ...item, periodSnapshotId: period.id }))
      });
    }
    await tx.paymentPeriodSnapshotAllocation.deleteMany({ where: { periodSnapshotId: period.id } });
    if (snapshot.allocations.length) {
      await tx.paymentPeriodSnapshotAllocation.createMany({
        data: snapshot.allocations.map((allocation) => ({
          periodSnapshotId: period.id,
          label: allocation.label,
          percentage: allocation.percentage,
          sortOrder: allocation.sortOrder
        }))
      });
    }

    return period;
  });
}

async function syncHistory(debts, profile, today = new Date(), includeCurrent = true) {
  const periods = getTrackablePeriodDates(today, includeCurrent);
  for (const periodDate of periods) {
    await syncPeriod(periodDate, debts, profile, today);
  }
}

function toHistoryProjection(snapshot) {
  const bucketMap = new Map();

  snapshot.items.forEach((item) => {
    if (!bucketMap.has(item.bucketKey)) {
      bucketMap.set(item.bucketKey, {
        key: item.bucketKey,
        label: item.paymentLabel,
        date: item.paymentDate,
        day: item.paymentDay,
        items: [],
        total: 0
      });
    }

    const bucket = bucketMap.get(item.bucketKey);
    const amount = toNumber(item.amount);
    bucket.items.push({
      id: item.debtId,
      name: item.debtName,
      amount,
      paymentDay: item.paymentDay,
      cardName: item.cardName,
      isRecurring: item.isRecurring,
      progress: {
        label: item.progressLabel,
        remainingLabel: item.remainingLabel
      }
    });
    bucket.total += amount;
  });

  const expectedBuckets = [
    { key: "current-30", date: snapshot.periodStart, day: 30 },
    { key: "next-15", date: snapshot.periodEnd, day: 15 }
  ];
  const buckets = expectedBuckets.map((expected) =>
    bucketMap.get(expected.key) || {
      ...expected,
      label: dayjs(expected.date).format("DD [de] MMMM YYYY"),
      items: [],
      total: 0
    }
  );
  const income = toNumber(snapshot.income);
  const totalToPay = toNumber(snapshot.totalToPay);
  const balance = toNumber(snapshot.balance);
  const spendingAllocations = normalizeAllocations(snapshot.allocations);
  const spendingSummary = buildSpendingSummary(balance, spendingAllocations);

  return {
    id: snapshot.id,
    periodKey: snapshot.periodKey,
    periodLabel: snapshot.periodLabel,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    isClosed: snapshot.isClosed,
    income,
    currency: snapshot.currency,
    totalToPay,
    balance,
    buckets,
    spendingSummary,
    spendingAllocations
  };
}

module.exports = {
  HISTORY_START,
  getTrackablePeriodDates,
  syncHistory,
  toHistoryProjection
};
