const router = require("express").Router();
const cardsController = require("../controllers/cards.controller");

router.get("/", cardsController.index);
router.post("/", cardsController.create);
router.post("/:id/delete", cardsController.remove);

module.exports = router;
