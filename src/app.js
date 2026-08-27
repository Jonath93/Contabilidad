const express = require("express");
const path = require("path");

const dashboardRoutes = require("./routes/dashboard.routes");
const debtRoutes = require("./routes/debts.routes");
const profileRoutes = require("./routes/profile.routes");
const cardRoutes = require("./routes/cards.routes");
const statementRoutes = require("./routes/statements.routes");
const historyRoutes = require("./routes/history.routes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use("/", dashboardRoutes);
app.use("/deudas", debtRoutes);
app.use("/perfil", profileRoutes);
app.use("/tarjetas", cardRoutes);
app.use("/estados", statementRoutes);
app.use("/historial", historyRoutes);

app.use((req, res) => {
  res.status(404).render("layouts/page", {
    title: "Pagina no encontrada",
    view: "partials/not-found",
    data: {}
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("layouts/page", {
    title: "Error",
    view: "partials/error",
    data: { error: err }
  });
});

module.exports = app;
