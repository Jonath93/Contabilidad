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

function setupProfileAllocations() {
  const form = document.querySelector("[data-profile-form]");
  if (!form) return;

  const list = form.querySelector("[data-allocation-list]");
  const template = form.querySelector("[data-allocation-template]");
  const totalLabel = form.querySelector("[data-allocation-total]");
  const validation = form.querySelector("[data-allocation-validation]");

  function rows() {
    return [...list.querySelectorAll("[data-allocation-row]")];
  }

  function update() {
    const total = rows().reduce((sum, row) => {
      return sum + Number(row.querySelector("[data-allocation-percentage]").value || 0);
    }, 0);
    const roundedTotal = Math.round(total * 100) / 100;
    const isValid = Math.abs(roundedTotal - 100) < 0.001;

    totalLabel.textContent = `${roundedTotal.toFixed(2).replace(/\.00$/, "")}%`;
    totalLabel.classList.toggle("valid", isValid);
    totalLabel.classList.toggle("invalid", !isValid);
    validation.textContent = isValid
      ? "Distribución completa"
      : roundedTotal < 100
        ? `Falta asignar ${(100 - roundedTotal).toFixed(2)}%`
        : `Sobra ${(roundedTotal - 100).toFixed(2)}%`;
    validation.classList.toggle("valid", isValid);

    const percentageInputs = form.querySelectorAll("[data-allocation-percentage]");
    percentageInputs.forEach((input) => input.setCustomValidity(isValid ? "" : "Los porcentajes deben sumar exactamente 100%."));
    rows().forEach((row) => {
      row.querySelector("[data-remove-allocation]").disabled = rows().length === 1;
    });
  }

  list.addEventListener("input", update);
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-allocation]");
    if (!button || rows().length === 1) return;
    button.closest("[data-allocation-row]").remove();
    update();
  });

  form.querySelector("[data-add-allocation]").addEventListener("click", () => {
    if (rows().length >= 20) return;
    list.appendChild(template.content.cloneNode(true));
    const newRow = rows()[rows().length - 1];
    newRow.querySelector('input[name="allocationLabel"]').focus();
    update();
  });

  form.addEventListener("submit", (event) => {
    update();
    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
    }
  });

  update();
}

setupProfileAllocations();
