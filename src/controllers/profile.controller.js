const prisma = require("../config/prisma");
const { getProfile } = require("../services/profile.service");

async function edit(req, res, next) {
  try {
    const profile = await getProfile();
    res.render("layouts/page", {
      title: "Perfil",
      view: "profile/edit",
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    await prisma.userProfile.upsert({
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

    res.redirect("/");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  edit,
  update
};
