function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(Number(value || 0));
}

function setupDebtPreview() {
  const form = document.querySelector("[data-debt-form]");
  if (!form) return;

  const amount = form.querySelector("[data-monthly-amount]");
  const months = form.querySelector("[data-months]");
  const recurring = form.querySelector("[data-recurring]");
  const preview = form.querySelector("[data-total-preview]");

  function update() {
    const monthly = Number(amount.value || 0);
    const monthCount = Number(months.value || 0);

    if (recurring.checked) {
      months.value = "";
      months.disabled = true;
      preview.textContent = `${formatMoney(monthly)} mensual indefinido`;
      return;
    }

    months.disabled = false;
    preview.textContent = formatMoney(monthly * monthCount);
  }

  amount.addEventListener("input", update);
  months.addEventListener("input", update);
  recurring.addEventListener("change", update);
  update();
}

setupDebtPreview();

function setupLatinDateInputs() {
  document.querySelectorAll(".latin-date-input").forEach((input) => {
    input.addEventListener("input", () => {
      input.setCustomValidity("");
      const digits = input.value.replace(/\D/g, "").slice(0, 8);
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);

      input.value = [day, month, year].filter(Boolean).join("/");
    });

    input.addEventListener("blur", () => {
      if (!input.value) return;

      const match = input.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) {
        input.setCustomValidity("Usa el formato dd/mm/aaaa.");
        return;
      }

      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);
      const date = new Date(year, month - 1, day);
      const isValid =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

      input.setCustomValidity(isValid ? "" : "La fecha no es valida.");
    });
  });
}

setupLatinDateInputs();
