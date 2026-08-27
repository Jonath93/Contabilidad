const prisma = require("../config/prisma");
const { getProfile } = require("../services/profile.service");
const { syncHistory } = require("../services/paymentHistory.service");

async function edit(req, res, next) {
  try {
    const profile = await getProfile();
    res.render("layouts/page", {
      title: "Perfil",
      view: "profile/edit",
      data: { profile, error: null, saved: req.query.saved === "1" }
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const labels = Array.isArray(req.body.allocationLabel)
      ? req.body.allocationLabel
      : [req.body.allocationLabel];
    const percentages = Array.isArray(req.body.allocationPercentage)
      ? req.body.allocationPercentage
      : [req.body.allocationPercentage];
    const allocations = labels
      .map((label, index) => ({
        label: String(label || "").trim(),
        percentage: Number(percentages[index]),
        sortOrder: index
      }))
      .filter((allocation) => allocation.label || Number.isFinite(allocation.percentage));
    const totalPercentage = allocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
    const isValid =
      allocations.length > 0 &&
      allocations.length <= 20 &&
      allocations.every((allocation) => allocation.label && allocation.percentage > 0 && allocation.percentage <= 100) &&
      Math.abs(totalPercentage - 100) < 0.001;

    if (!isValid) {
      return res.status(422).render("layouts/page", {
        title: "Perfil",
        view: "profile/edit",
        data: {
          profile: {
            name: req.body.name || "Usuario",
            monthlyIncome: req.body.monthlyIncome || 0,
            currency: req.body.currency || "MXN",
            spendingAllocations: allocations.length ? allocations : [{ label: "", percentage: 100, sortOrder: 0 }]
          },
          error: "Los porcentajes deben ser mayores a 0 y sumar exactamente 100%.",
          saved: false
        }
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userProfile.upsert({
        where: { id: 1 },
        update: {
          name: req.body.name || "Usuario",
          monthlyIncome: req.body.monthlyIncome || 0,
          currency: req.body.currency || "MXN"
        },
        create: {
          id: 1,
          name: req.body.name || "Usuario",
          monthlyIncome: req.body.monthlyIncome || 0,
          currency: req.body.currency || "MXN"
        }
      });
      await tx.spendingAllocation.deleteMany({ where: { profileId: 1 } });
      await tx.spendingAllocation.createMany({
        data: allocations.map((allocation) => ({ ...allocation, profileId: 1 }))
      });
    });

    const [updatedProfile, debts] = await Promise.all([
      getProfile(),
      prisma.debt.findMany({ include: { creditCard: true } })
    ]);
    await syncHistory(debts, updatedProfile, new Date(), true);

    res.redirect("/perfil?saved=1");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  edit,
  update
};
