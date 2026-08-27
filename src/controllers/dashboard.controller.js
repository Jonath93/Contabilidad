const prisma = require("../config/prisma");
const { getProfile } = require("../services/profile.service");
const { buildFutureProjections } = require("../services/paymentProjection.service");
const { syncHistory } = require("../services/paymentHistory.service");
const { money, dateLabel } = require("../services/formatters");

async function index(req, res, next) {
  try {
    const requestedPeriod = Number(req.query.period || 0);
    const selectedPeriodIndex = Number.isFinite(requestedPeriod)
      ? Math.min(Math.max(Math.trunc(requestedPeriod), 0), 11)
      : 0;
    const [profile, debts] = await Promise.all([
      getProfile(),
      prisma.debt.findMany({
        include: { creditCard: true },
        orderBy: [{ paymentDay: "asc" }, { name: "asc" }]
      })
    ]);

    const today = new Date();
    await syncHistory(debts, profile, today, true);
    const futureProjections = buildFutureProjections(debts, profile, today, 12);
    const projection = futureProjections[selectedPeriodIndex];
    const periodOptions = futureProjections.map((period, index) => ({
      index,
      label: period.periodLabel
    }));

    res.render("layouts/page", {
      title: "Dashboard",
      view: "dashboard/index",
      data: {
        projection,
        periodOptions,
        selectedPeriodIndex,
        money,
        dateLabel
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  index
};
