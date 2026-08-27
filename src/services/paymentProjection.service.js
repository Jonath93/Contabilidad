const dayjs = require("dayjs");
const localeData = require("dayjs/plugin/localeData");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
require("dayjs/locale/es");

const { toNumber } = require("./formatters");
const { buildSpendingSummary, normalizeAllocations } = require("./spendingAllocation.service");

dayjs.extend(localeData);
dayjs.extend(isSameOrBefore);
dayjs.locale("es");

function clampDay(year, monthIndex, day) {
  const base = dayjs().year(year).month(monthIndex).date(1);
  return base.date(Math.min(day, base.daysInMonth())).startOf("day");
}

function getFirstPaymentDate(debt) {
  const start = dayjs(debt.startDate).startOf("day");
  const paymentDay = Number(debt.paymentDay);
  const cutOffDay = debt.creditCard?.cutOffDay ? Number(debt.creditCard.cutOffDay) : null;

  if (cutOffDay) {
    const statementMonth = start.date() <= cutOffDay ? start : start.add(1, "month");
    const paymentMonth = paymentDay > cutOffDay ? statementMonth : statementMonth.add(1, "month");
    return clampDay(paymentMonth.year(), paymentMonth.month(), paymentDay);
  }

  const paymentMonth = start.date() <= paymentDay ? start : start.add(1, "month");
  return clampDay(paymentMonth.year(), paymentMonth.month(), paymentDay);
}

function getPaymentIndex(debt, targetDate) {
  const firstPayment = getFirstPaymentDate(debt);
  const target = dayjs(targetDate).startOf("day");

  if (!target.isSame(firstPayment, "day") && target.isBefore(firstPayment, "day")) {
    return -1;
  }

  return target.startOf("month").diff(firstPayment.startOf("month"), "month");
}

function getPaymentDateByIndex(debt, paymentIndex) {
  const firstPayment = getFirstPaymentDate(debt);
  const paymentMonth = firstPayment.add(paymentIndex, "month");
  return clampDay(paymentMonth.year(), paymentMonth.month(), Number(debt.paymentDay));
}

function getNextPaymentDate(debt, today = new Date()) {
  const firstPayment = getFirstPaymentDate(debt);
  const base = dayjs(today).startOf("day");
  const totalMonths = debt.months || debt.remainingMonths;

  if (base.isBefore(firstPayment, "day") || base.isSame(firstPayment, "day")) {
    return firstPayment;
  }

  let paymentIndex = base.startOf("month").diff(firstPayment.startOf("month"), "month");
  let nextPayment = getPaymentDateByIndex(debt, paymentIndex);

  if (nextPayment.isBefore(base, "day")) {
    paymentIndex += 1;
    nextPayment = getPaymentDateByIndex(debt, paymentIndex);
  }

  if (!debt.isRecurring && totalMonths && paymentIndex >= totalMonths) {
    return null;
  }

  return nextPayment;
}

function getPlanningWindow(today = new Date()) {
  const base = dayjs(today).startOf("day");
  const currentMonthPayDate = clampDay(base.year(), base.month(), 30);
  const nextMonth = base.add(1, "month");
  const nextMonthPayDate = clampDay(nextMonth.year(), nextMonth.month(), 15);
  const periodLabel = base.year() === nextMonth.year()
    ? `${base.format("MMMM")} a ${nextMonth.format("MMMM YYYY")}`
    : `${base.format("MMMM YYYY")} a ${nextMonth.format("MMMM YYYY")}`;

  return {
    today: base.toDate(),
    monthName: base.format("MMMM YYYY"),
    periodLabel,
    targets: [
      {
        key: "current-30",
        label: currentMonthPayDate.format("DD [de] MMMM YYYY"),
        date: currentMonthPayDate.toDate(),
        day: 30
      },
      {
        key: "next-15",
        label: nextMonthPayDate.format("DD [de] MMMM YYYY"),
        date: nextMonthPayDate.toDate(),
        day: 15
      }
    ]
  };
}

function debtIsActiveOn(debt, targetDate) {
  if (debt.isPaidOff) return false;

  const paymentIndex = getPaymentIndex(debt, targetDate);
  if (paymentIndex < 0) return false;
  if (debt.isRecurring) return true;

  const months = debt.remainingMonths || debt.months;
  if (!months) return true;

  return paymentIndex < months;
}

function getInstallmentProgress(debt, targetDate) {
  if (debt.isRecurring) {
    return {
      label: "Indefinido",
      remainingLabel: "Mes a mes"
    };
  }

  const totalMonths = debt.months || debt.remainingMonths;
  if (!totalMonths) {
    return {
      label: "-",
      remainingLabel: null
    };
  }

  const paymentIndex = getPaymentIndex(debt, targetDate);
  const currentMonth = Math.min(Math.max(paymentIndex + 1, 1), totalMonths);
  const remainingMonths = Math.max(totalMonths - currentMonth, 0);

  return {
    label: `${String(currentMonth).padStart(2, "0")} de ${String(totalMonths).padStart(2, "0")}`,
    remainingLabel: remainingMonths === 0 ? "Ultimo pago" : remainingMonths === 1 ? "Falta 1" : `Faltan ${remainingMonths}`
  };
}

function buildProjection(debts, profile, today = new Date()) {
  const window = getPlanningWindow(today);
  const currency = profile?.currency || "MXN";
  const income = toNumber(profile?.monthlyIncome);

  const buckets = window.targets.map((target) => {
    const items = debts
      .filter((debt) => Number(debt.paymentDay) === target.day)
      .filter((debt) => debtIsActiveOn(debt, target.date))
      .map((debt) => {
        const progress = getInstallmentProgress(debt, target.date);

        return {
          id: debt.id,
          name: debt.name,
          amount: toNumber(debt.monthlyAmount),
          paymentDay: debt.paymentDay,
          cardName: debt.creditCard?.name || null,
          isRecurring: debt.isRecurring,
          progress
        };
      });

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return {
      ...target,
      items,
      total
    };
  });

  const totalToPay = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  const balance = income - totalToPay;
  const spendingAllocations = normalizeAllocations(profile?.spendingAllocations);
  const spendingSummary = buildSpendingSummary(balance, spendingAllocations);

  return {
    ...window,
    buckets,
    income,
    currency,
    totalToPay,
    balance,
    spendingSummary,
    spendingAllocations
  };
}

function buildFutureProjections(debts, profile, today = new Date(), count = 12) {
  const base = dayjs(today).startOf("day");

  return Array.from({ length: count }, (_, index) => {
    const periodDate = base.add(index, "month").toDate();
    return buildProjection(debts, profile, periodDate);
  });
}

module.exports = {
  buildFutureProjections,
  buildProjection,
  debtIsActiveOn,
  getFirstPaymentDate,
  getInstallmentProgress,
  getNextPaymentDate,
  getPlanningWindow
};
