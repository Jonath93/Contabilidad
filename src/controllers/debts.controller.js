const prisma = require("../config/prisma");
const { money, dateLabel } = require("../services/formatters");
const { parseLatinDate } = require("../services/dateInput.service");

async function index(req, res, next) {
  try {
    const [debts, cards] = await Promise.all([
      prisma.debt.findMany({
        include: { creditCard: true },
        orderBy: [{ isPaidOff: "asc" }, { paymentDay: "asc" }, { name: "asc" }]
      }),
      prisma.creditCard.findMany({ orderBy: { name: "asc" } })
    ]);

    res.render("layouts/page", {
      title: "Deudas",
      view: "debts/index",
      data: { debts, cards, money, dateLabel }
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const monthlyAmount = Number(req.body.monthlyAmount || 0);
    const months = req.body.months ? Number(req.body.months) : null;
    const isRecurring = req.body.isRecurring === "on";
    const totalAmount = months ? monthlyAmount * months : null;

    await prisma.debt.create({
      data: {
        name: req.body.name,
        sourceType: isRecurring ? "RECURRING" : "MANUAL",
        totalAmount,
        monthlyAmount,
        months: isRecurring ? null : months,
        remainingMonths: isRecurring ? null : months,
        startDate: parseLatinDate(req.body.startDate),
        isRecurring,
        paymentDay: Number(req.body.paymentDay),
        creditCardId: req.body.creditCardId ? Number(req.body.creditCardId) : null,
        notes: req.body.notes || null
      }
    });

    res.redirect("/deudas");
  } catch (error) {
    next(error);
  }
}

async function togglePaid(req, res, next) {
  try {
    const debt = await prisma.debt.findUnique({ where: { id: Number(req.params.id) } });
    if (debt) {
      await prisma.debt.update({
        where: { id: debt.id },
        data: { isPaidOff: !debt.isPaidOff }
      });
    }
    res.redirect("/deudas");
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await prisma.debt.delete({ where: { id: Number(req.params.id) } });
    res.redirect("/deudas");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  index,
  create,
  togglePaid,
  remove
};
