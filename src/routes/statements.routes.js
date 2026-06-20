const path = require("path");
const multer = require("multer");
const router = require("express").Router();
const statementsController = require("../controllers/statements.controller");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || "uploads");
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.-]+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || path.extname(file.originalname).toLowerCase() === ".pdf";
    cb(isPdf ? null : new Error("Solo se permiten archivos PDF."), isPdf);
  }
});

router.get("/", statementsController.index);
router.post("/", upload.single("statementFile"), statementsController.upload);
router.post("/:id/purchases", statementsController.savePurchases);

module.exports = router;
