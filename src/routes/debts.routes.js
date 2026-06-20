const router = require("express").Router();
const debtsController = require("../controllers/debts.controller");

router.get("/", debtsController.index);
router.post("/", debtsController.create);
router.post("/:id/toggle-paid", debtsController.togglePaid);
router.post("/:id/delete", debtsController.remove);

module.exports = router;
