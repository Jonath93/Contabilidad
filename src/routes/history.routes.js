const router = require("express").Router();
const historyController = require("../controllers/history.controller");

router.get("/", historyController.index);

module.exports = router;
