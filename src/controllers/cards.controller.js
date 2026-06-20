const prisma = require("../config/prisma");
const { dateLabel, money, toNumber } = require("../services/formatters");
const { getInstallmentProgress, getNextPaymentDate } = require("../services/paymentProjection.service");

async function index(req, res, next) {
  try {
    const cards = await prisma.creditCard.findMany({ orderBy: { name: "asc" } });
    const requestedCardId = Number(req.query.cardId || cards[0]?.id || 0);
    const selectedCardId = Number.isFinite(requestedCardId) ? requestedCardId : cards[0]?.id;
    const selectedCard = cards.find((card) => card.id === selectedCardId) || cards[0] || null;
    const cardDebts = selectedCard
      ? await prisma.debt.findMany({
          where: {
            creditCardId: selectedCard.id,
            isPaidOff: false
          },
          orderBy: [{ paymentDay: "asc" }, { name: "asc" }]
        })
      : [];

    const today = new Date();
    const cardDebtRows = cardDebts
      .map((debt) => {
        const debtWithCard = { ...debt, creditCard: selectedCard };
        const nextPaymentDate = getNextPaymentDate(debtWithCard, today);
        const totalMonths = debt.months || debt.remainingMonths;
        const calculatedTotal = totalMonths ? toNumber(debt.monthlyAmount) * totalMonths : null;

        return {
          ...debt,
          nextPaymentDate: nextPaymentDate?.toDate() || null,
          progress: nextPaymentDate
            ? getInstallmentProgress(debtWithCard, nextPaymentDate.toDate())
            : {
                label: totalMonths ? `${String(totalMonths).padStart(2, "0")} de ${String(totalMonths).padStart(2, "0")}` : "-",
                remainingLabel: "Finalizada"
              },
          finiteTotal: debt.totalAmount ? toNumber(debt.totalAmount) : calculatedTotal
        };
      })
      .filter((debt) => debt.nextPaymentDate || debt.isRecurring);

    const monthlyTotal = cardDebtRows.reduce((sum, debt) => sum + toNumber(debt.monthlyAmount), 0);
    const finiteTotal = cardDebtRows.reduce((sum, debt) => sum + (debt.finiteTotal || 0), 0);

    res.render("layouts/page", {
      title: "Tarjetas",
      view: "cards/index",
      data: {
        cards,
        selectedCard,
        selectedCardId: selectedCard?.id || "",
        cardDebtRows,
        cardDebtSummary: {
          count: cardDebtRows.length,
          monthlyTotal,
          finiteTotal
        },
        money,
        dateLabel
      }
    });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    await prisma.creditCard.create({
      data: {
        name: req.body.name,
        bankName: req.body.bankName || null,
        cutOffDay: Number(req.body.cutOffDay),
        paymentDueDay: Number(req.body.paymentDueDay),
        preferredPaymentDay: Number(req.body.preferredPaymentDay)
      }
    });
    res.redirect("/tarjetas");
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await prisma.creditCard.delete({ where: { id: Number(req.params.id) } });
    res.redirect("/tarjetas");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  index,
  create,
  remove
};
