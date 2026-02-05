$(function () {
  const $results = $("#results");

  $.ajax({
    url: "/api/status",
    method: "GET",
    dataType: "json",
  })
    .done(function () {
      loadFavorites();
    })
    .fail(function (xhr) {
      if (xhr.status === 401) {
        window.location.href = "/Login.html";
      } else {
        loadFavorites();
      }
    });

  function loadFavorites() {
    $results.html("<p>Loading your favorites…</p>");

    $.getJSON("/api/favorites")
      .done(function (items) {
        renderFavorites(items);
      })
      .fail(function (xhr) {
        if (xhr.status === 401) {
          $results.html(
            '<p>Please <a href="SignUp.html">sign in</a> to view your favorites.</p>'
          );
        } else {
          $results.html("<p>Error loading favorites.</p>");
        }
      });
  }

  function renderFavorites(items) {
    $results.empty();

    if (!items.length) {
      return $results.append("<p>No favorites yet.</p>");
    }

    items.forEach(function (item) {
      const safeName = $("<div>").text(item.name).html();

      const $card = $(`
        <div class="food-card">
          <h3></h3>
          <button class="btn details-btn">Details</button>
          <button class="btn add-to-plan-btn">Add to Plan</button>
          <button class="btn unfav-btn">Unfavorite</button>
        </div>
      `);

      $card.find("h3").text(safeName);

      $card.find(".details-btn").on("click", function () {
        window.location.href = `details.html?food_id=${encodeURIComponent(
          item.food_id
        )}&source=db`;
      });

      // “Add to Plan” button
      $card
        .find(".add-to-plan-btn")
        .data("id", item.food_id)
        .on("click", function () {
          const foodId = $(this).data("id");

          $.getJSON("/api/mealplan/list")
            .done(function (plans) {
              if (!plans.length) {
                return alert(
                  "You have no meal plans yet. Create one first on the Meal Plan page."
                );
              }
              $.getJSON(`/api/db/foods/${encodeURIComponent(foodId)}`)
                .done(function (res) {
                  openAddToPlanModal(res.food, plans);
                })
                .fail(function (xhr) {
                  if (xhr.status === 401) {
                    alert("Session expired. Please sign in again.");
                    window.location.href = "/SignUp.html";
                  } else {
                    alert("Could not fetch food details.");
                  }
                });
            })
            .fail(function (xhr) {
              if (xhr.status === 401) {
                alert("Session expired. Please sign in again.");
                window.location.href = "/SignUp.html";
              } else {
                alert("Could not load your meal plans.");
              }
            });
        });

      // “Unfavorite” button
      $card
        .find(".unfav-btn")
        .data("id", item.food_id)
        .on("click", function () {
          const id = $(this).data("id");
          $.ajax({
            url: `/api/favorites/${encodeURIComponent(id)}`,
            method: "DELETE",
          })
            .done(() => $card.remove())
            .fail((xhr) => {
              if (xhr.status === 401) {
                alert("Session expired. Please sign in again.");
                window.location.href = "/SignUp.html";
              } else {
                alert("Could not remove favorite.");
              }
            });
        });

      $results.append($card);
    });
  }

  // “Add to Plan” MODAL
  function openAddToPlanModal(food, plans) {
    $("#add-to-plan-modal").remove();

    const safeFoodName = $("<div>").text(food.food_name).html();

    const $modal = $(`
      <div id="add-to-plan-modal" class="modal-overlay">
        <div class="modal">
          <h2>Add “${safeFoodName}” to Plan</h2>

          <label for="plan-select">Select plan:</label>
          <select id="plan-select"></select>

          <label for="meal-type-select">Meal type:</label>
          <select id="meal-type-select">
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>

          <label for="serving-select">Serving:</label>
          <select id="serving-select"></select>

          <label for="quantity-input">Quantity:</label>
          <input type="number" id="quantity-input" min="0.1" step="0.1" value="1"/>

          <div class="modal-actions">
            <button id="add-item-cancel" class="btn">Cancel</button>
            <button id="add-item-confirm" class="btn">Add</button>
          </div>
        </div>
      </div>
    `);

    // Populate “plan-select”
    plans.forEach((p) => {
      const safePlanName = $("<div>").text(p.name).html();
      $("#plan-select", $modal).append(
        `<option value="${p.plan_id}">${safePlanName}</option>`
      );
    });

    // Populate “serving-select”
    food.servings.serving.forEach((s) => {
      const safeDesc = $("<div>").text(s.serving_description).html();
      $("#serving-select", $modal).append(
        `<option value="${s.serving_id}">${safeDesc}</option>`
      );
    });

    $("body").append($modal);

    $("#add-item-cancel").click(() => $("#add-to-plan-modal").remove());

    $("#add-item-confirm").click(() => {
      const planId = $("#plan-select").val();
      const mealType = $("#meal-type-select").val();
      const serving = $("#serving-select").val();
      const qty = parseFloat($("#quantity-input").val());

      if (!qty || qty <= 0) {
        return alert("Please enter a valid quantity.");
      }

      $.ajax({
        url: "/api/mealplan/items",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          plan_id: planId,
          food_id:    food.food_id,
          serving_id: serving,
          quantity: qty,
          meal_type: mealType,
        }),
      })
        .done(() => {
          alert("Item added to meal plan!");
          $("#add-to-plan-modal").remove();
        })
        .fail((xhr) => {
          if (xhr.status === 401) {
            alert("Session expired. Please sign in again.");
            window.location.href = "/SignUp.html";
          } else {
            alert("Failed to add item.");
          }
        });
    });
  }
});
