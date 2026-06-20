const prisma = require("../config/prisma");

async function getProfile() {
  return prisma.userProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Usuario",
      monthlyIncome: 0,
      currency: "MXN"
    }
  });
}

module.exports = {
  getProfile
};
