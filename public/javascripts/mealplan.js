function drawDonut(canvasId, percent, color) {
  new Chart(document.getElementById(canvasId), {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [percent, 100 - percent],
          backgroundColor: [color, "#ececec"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: "70%",
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    },
  });
}

$(function () {
  loadPlansOverview();
});

function loadPlansOverview() {
  const $grid = $("#mealPlan");
  $grid.addClass("results-grid").html("<p>Loading your meal plans…</p>");

  $.getJSON("/api/mealplan/list")
    .done(function (plans) {
      $grid.empty();

      const $headerCard = $(`
        <div class="food-card plan-overview-card header-card">
          <h3 class="plan-name"></h3>
          <div class="macros-charts">
            <span class="header-item">Carbs</span>
            <span class="header-item">Protein</span>
            <span class="header-item">Fats</span>
          </div>
          <div class="plan-controls">
            <button class="delete-plan-btn invisible">Delete</button>
          </div>
        </div>
      `);
      $grid.append($headerCard);

      // For each plan, fetch its summary to compute percentages
      const summaryPromises = plans.map((plan) => {
        return $.getJSON(`/api/mealplan/${plan.plan_id}/summary`)
          .done((data) => {
            const { totals = {}, targets = {} } = data;
            const carbsPct = targets.carbs
              ? Math.round((totals.carbs / targets.carbs) * 100)
              : 0;
            const proteinPct = targets.protein
              ? Math.round((totals.protein / targets.protein) * 100)
              : 0;
            const fatsPct = targets.fat
              ? Math.round((totals.fat / targets.fat) * 100)
              : 0;

            const $card = $(`
              <div class="food-card plan-overview-card" data-plan-id="${
                plan.plan_id
              }">
                <h3 class="plan-name clickable">${plan.name}</h3>
                <div class="macros-charts">
                  <div class="chart-wrapper">
                    <canvas id="carbs-${
                      plan.plan_id
                    }" width="120" height="120"></canvas>
                    <div class="chart-label">
                      ${Math.round(totals.carbs)}/${Math.round(targets.carbs)}g
                    </div>
                  </div>
                  <div class="chart-wrapper">
                    <canvas id="protein-${
                      plan.plan_id
                    }" width="120" height="120"></canvas>
                    <div class="chart-label">
                      ${Math.round(totals.protein)}/${Math.round(
              targets.protein
            )}g
                    </div>
                  </div>
                  <div class="chart-wrapper">
                    <canvas id="fat-${
                      plan.plan_id
                    }" width="120" height="120"></canvas>
                    <div class="chart-label">
                      ${Math.round(totals.fat)}/${Math.round(targets.fat)}g
                    </div>
                  </div>
                </div>
                <div class="plan-controls">
                  <button class="delete-plan-btn">Delete</button>
                </div>
              </div>
            `);
            $grid.append($card);

            // Draw each doughnut
            drawDonut(
              `carbs-${plan.plan_id}`,
              carbsPct,
              "rgba(246,180,66,0.8)"
            );
            drawDonut(
              `protein-${plan.plan_id}`,
              proteinPct,
              "rgba(48,138,255,0.8)"
            );
            drawDonut(`fat-${plan.plan_id}`, fatsPct, "rgba(245,79,79,0.8)");

            // “Delete Plan” button:
            $card.find(".delete-plan-btn").on("click", () => {
              if (!confirm(`Delete meal plan “${plan.name}”?`)) return;
              $.ajax({
                url: `/api/mealplan/${plan.plan_id}`,
                method: "DELETE",
              })
                .done(() => loadPlansOverview())
                .fail((xhr) =>
                  alert(
                    "Could not delete plan: " +
                      (xhr.responseJSON?.error || xhr.statusText)
                  )
                );
            });
          })
          .fail(() => {
            $grid.append(`
              <div class="food-card plan-overview-card" data-plan-id="${plan.plan_id}">
                <h3 class="plan-name clickable">${plan.name}</h3>
                <p class="macros"><span>Summary unavailable</span></p>
              </div>
            `);
          });
      });

      // “+ Create New Plan” card
      $.when
        .apply(
          $,
          summaryPromises.length ? summaryPromises : [$.Deferred().resolve()]
        )
        .always(() => {
          const $addCard = $(`
            <div class="food-card add-new-card">
              <button class="create-btn" id="create-plan">+ Create New Plan</button>
            </div>
          `);
          $grid.append($addCard);

          $("#create-plan")
            .off("click")
            .on("click", () => {
              const name = prompt("Enter a name for your new meal plan:");
              if (!name || !name.trim()) return alert("Plan name is required.");
              $.ajax({
                url: "/api/mealplan",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ name: name.trim() }),
              })
                .done(() => loadPlansOverview())
                .fail((xhr) =>
                  alert(
                    "Could not create plan: " +
                      (xhr.responseJSON?.error || xhr.statusText)
                  )
                );
            });

          $grid
            .off("click", ".plan-overview-card:not(.header-card)")
            .on("click", ".plan-overview-card:not(.header-card)", function (e) {
              if ($(e.target).closest(".delete-plan-btn").length) return;
              const pid = $(this).data("plan-id");
              loadPlanDetails(pid);
            });
        });
    })
    .fail(() => {
      $grid.html("<p>Could not load your meal plans.</p>");
    });
}

function loadPlanDetails(planId) {
  const $grid = $("#mealPlan");
  $grid.removeClass("results-grid").html("<p>Loading plan details…</p>");

  $.getJSON(`/api/mealplan/${planId}/items`)
    .done(function (data) {
      const planName = data.plan.name;
      const items = data.items || [];
      const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };

      items.forEach((item) => {
        const type = item.meal_type || "snack";
        (groups[type] || groups.snack).push(item);
      });

      let html = `
        <button id="back-to-overview" class="btn back-btn">
          &larr; Back to Plans
        </button>
        <h2>${planName}</h2>
      `;

      ["breakfast", "lunch", "dinner", "snack"].forEach((meal) => {
        const display = meal.charAt(0).toUpperCase() + meal.slice(1);
        const list = groups[meal] || [];

        html += `<section class="meal-section"><h3>${display}</h3>`;
        if (!list.length) {
          html += `<p>No items added for ${display}.</p></section>`;
          return;
        }

        html += `
          <table class="mealplan-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Calories</th>
                <th>Protein (g)</th>
                <th>Carbs (g)</th>
                <th>Fat (g)</th>
                <th>Details</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
        `;

        list.forEach((item) => {
          const cals = parseFloat(item.calories);
          const protein = parseFloat(item.protein);
          const carbs = parseFloat(item.carbs);
          const fat = parseFloat(item.fat);

          html += `
            <tr
              data-id="${item.id}"
              data-food-id="${item.food_id}"
              data-serving-id="${item.serving_id}"
            >
              <td>${item.food_name}</td>
              <td>${!isNaN(cals) ? cals.toFixed(0) : "-"}</td>
              <td>${!isNaN(protein) ? protein.toFixed(1) : "-"}</td>
              <td>${!isNaN(carbs) ? carbs.toFixed(1) : "-"}</td>
              <td>${!isNaN(fat) ? fat.toFixed(1) : "-"}</td>
              <td>
                <button
                  class="btn details-btn"
                  onclick="location.href='details.html?food_id=${
                    item.food_id
                  }&source=db'"
                >
                  More Details
                </button>
              </td>
              <td>
                <button class="btn delete-btn" data-id="${item.id}">
                  Delete
                </button>
              </td>
            </tr>
          `;
        });

        html += `</tbody></table></section>`;
      });

      $grid.html(html);

      $("#back-to-overview").on("click", () => loadPlansOverview());

      $grid.find(".delete-btn").on("click", function () {
        const $btn = $(this);
        const id = $btn.data("id");
        $.ajax({
          url: `/api/mealplan/items/${id}`,
          method: "DELETE",
        })
          .done(() => $btn.closest("tr").remove())
          .fail(() => alert("Could not delete item."));
      });
    })
    .fail(function (jqXHR) {
      if (jqXHR.status === 401) {
        $grid.html(
          '<p>Please <a href="home.html">sign in</a> to view this plan.</p>'
        );
      } else {
        $grid.html("<p>Could not load plan details.</p>");
      }
    });
}
