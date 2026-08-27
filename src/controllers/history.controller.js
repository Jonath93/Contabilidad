const dayjs = require("dayjs");

const prisma = require("../config/prisma");
const { getProfile } = require("../services/profile.service");
const { syncHistory, toHistoryProjection } = require("../services/paymentHistory.service");
const { money } = require("../services/formatters");

async function index(req, res, next) {
  try {
    const today = new Date();
    const [profile, debts] = await Promise.all([
      getProfile(),
      prisma.debt.findMany({
        include: { creditCard: true },
        orderBy: [{ paymentDay: "asc" }, { name: "asc" }]
      })
    ]);

    await syncHistory(debts, profile, today, true);

    const snapshots = await prisma.paymentPeriodSnapshot.findMany({
      where: { periodStart: { lt: dayjs(today).startOf("month").toDate() } },
      include: {
        items: { orderBy: [{ paymentDate: "asc" }, { debtName: "asc" }] },
        allocations: { orderBy: { sortOrder: "asc" } }
      },
      orderBy: { periodStart: "desc" }
    });
    const requestedPeriod = String(req.query.period || "");
    const selectedSnapshot = snapshots.find((snapshot) => snapshot.periodKey === requestedPeriod) || snapshots[0] || null;
    const projection = selectedSnapshot ? toHistoryProjection(selectedSnapshot) : null;
    const periodOptions = snapshots.map((snapshot) => ({
      key: snapshot.periodKey,
      label: snapshot.periodLabel,
      isClosed: snapshot.isClosed
    }));

    res.render("layouts/page", {
      title: "Historial",
      view: "history/index",
      data: {
        projection,
        periodOptions,
        selectedPeriodKey: selectedSnapshot?.periodKey || "",
        money
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { index };
