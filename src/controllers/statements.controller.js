const path = require("path");

const prisma = require("../config/prisma");
const { parsePdf } = require("../services/statementParser.service");
const { money, dateLabel } = require("../services/formatters");
const { parseLatinDate } = require("../services/dateInput.service");

async function index(req, res, next) {
  try {
    const [statements, cards] = await Promise.all([
      prisma.statement.findMany({
        include: { creditCard: true, purchases: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.creditCard.findMany({ orderBy: { name: "asc" } })
    ]);

    res.render("layouts/page", {
      title: "Estados de cuenta",
      view: "statements/index",
      data: { statements, cards, money, dateLabel }
    });
  } catch (error) {
    next(error);
  }
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.redirect("/estados");
    }

    const statementDate = parseLatinDate(req.body.statementDate);
    const parsed = await parsePdf(req.file.path);

    const statement = await prisma.statement.create({
      data: {
        creditCardId: req.body.creditCardId ? Number(req.body.creditCardId) : null,
        statementDate,
        fileName: req.file.originalname,
        originalFilePath: path.resolve(req.file.path),
        parsedText: parsed.text
      }
    });

    res.render("layouts/page", {
      title: "Revisar compras detectadas",
      view: "statements/review",
      data: {
        statement,
        candidates: parsed.candidates,
        defaultPaymentDay: req.body.defaultPaymentDay || "30",
        money
      }
    });
  } catch (error) {
    next(error);
  }
}

async function savePurchases(req, res, next) {
  try {
    const statementId = Number(req.params.id);
    const selected = Array.isArray(req.body.selected) ? req.body.selected : req.body.selected ? [req.body.selected] : [];
    const descriptions = Array.isArray(req.body.description) ? req.body.description : [req.body.description];
    const monthlyAmounts = Array.isArray(req.body.monthlyAmount) ? req.body.monthlyAmount : [req.body.monthlyAmount];
    const totalMonths = Array.isArray(req.body.totalMonths) ? req.body.totalMonths : [req.body.totalMonths];
    const currentInstallments = Array.isArray(req.body.currentInstallment) ? req.body.currentInstallment : [req.body.currentInstallment];
    const remainingMonths = Array.isArray(req.body.remainingMonths) ? req.body.remainingMonths : [req.body.remainingMonths];
    const interestFree = Array.isArray(req.body.isInterestFree) ? req.body.isInterestFree : req.body.isInterestFree ? [req.body.isInterestFree] : [];
    const paymentDays = Array.isArray(req.body.paymentDay) ? req.body.paymentDay : [req.body.paymentDay];

    const statement = await prisma.statement.findUnique({ where: { id: statementId } });
    if (!statement) return res.redirect("/estados");

    for (const indexValue of selected) {
      const index = Number(indexValue);
      const monthlyAmount = Number(monthlyAmounts[index] || 0);
      const monthsValue = remainingMonths[index] ? Number(remainingMonths[index]) : null;
      const totalMonthsValue = totalMonths[index] ? Number(totalMonths[index]) : null;
      const currentInstallmentValue = currentInstallments[index] ? Number(currentInstallments[index]) : null;
      const description = descriptions[index] || "Compra a meses";

      const purchase = await prisma.statementPurchase.create({
        data: {
          statementId,
          description,
          monthlyAmount,
          totalAmount: totalMonthsValue ? monthlyAmount * totalMonthsValue : null,
          totalMonths: totalMonthsValue,
          currentInstallment: currentInstallmentValue,
          remainingMonths: monthsValue,
          isInterestFree: interestFree.includes(String(index))
        }
      });

      await prisma.debt.create({
        data: {
          name: purchase.description,
          sourceType: "STATEMENT",
          totalAmount: totalMonthsValue ? monthlyAmount * totalMonthsValue : null,
          monthlyAmount,
          months: monthsValue,
          remainingMonths: monthsValue,
          startDate: statement.statementDate,
          isRecurring: false,
          paymentDay: Number(paymentDays[index] || 30),
          creditCardId: statement.creditCardId,
          notes: `Importado del estado de cuenta ${statement.fileName}`
        }
      });
    }

    res.redirect("/deudas");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  index,
  upload,
  savePurchases
};
