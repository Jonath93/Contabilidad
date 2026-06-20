const router = require("express").Router();
const profileController = require("../controllers/profile.controller");

router.get("/", profileController.edit);
router.post("/", profileController.update);

module.exports = router;
