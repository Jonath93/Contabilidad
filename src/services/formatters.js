const dayjs = require("dayjs");

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function money(value, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency
  }).format(toNumber(value));
}

function dateLabel(value) {
  return dayjs(value).format("DD/MM/YYYY");
}

function monthLabel(value) {
  return dayjs(value).format("MMMM YYYY");
}

module.exports = {
  toNumber,
  money,
  dateLabel,
  monthLabel
};
