const prisma = require("../config/prisma");
const { DEFAULT_ALLOCATIONS } = require("./spendingAllocation.service");

async function getProfile() {
  const profile = await prisma.userProfile.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Usuario",
      monthlyIncome: 0,
      currency: "MXN"
    }
  });

  const allocationCount = await prisma.spendingAllocation.count({ where: { profileId: profile.id } });
  if (!allocationCount) {
    await prisma.spendingAllocation.createMany({
      data: DEFAULT_ALLOCATIONS.map((allocation) => ({ ...allocation, profileId: profile.id }))
    });
  }

  return prisma.userProfile.findUnique({
    where: { id: profile.id },
    include: { spendingAllocations: { orderBy: { sortOrder: "asc" } } }
  });
}

module.exports = {
  getProfile
};
