$(document).ready(function () {
  $.ajax({
    url: "/api/status",
    method: "GET",
    dataType: "json",
  })
    .done(function (res) {
      initSearchUI();
    })
    .fail(function (jqXHR) {
      if (jqXHR.status === 401) {
        window.location.href = "/Login.html";
      } else {
        initSearchUI();
      }
    });

  function initSearchUI() {
    $("#searchBtn").on("click", function () {
      const rawQuery = $("#foodQuery").val().trim();
      if (!rawQuery) {
        alert("Please enter a search term.");
        return;
      }

      $("#results").empty().append("<p>Loading…</p>");

      $.getJSON(`/api/foods/search?q=${encodeURIComponent(rawQuery)}`)
        .done(function (items) {
          renderResults(items);
        })
        .fail(function (jqXHR) {
          if (jqXHR.status === 401) {
            alert("Your session has expired. Please sign in again.");
            window.location.href = "/SignUp.html";
          } else {
            alert(
              "Could not fetch ingredients: " +
                (jqXHR.responseJSON?.error || jqXHR.statusText)
            );
            $("#results").empty();
          }
        });
    });
  }

  // xss-safe
  function renderResults(items) {
    $("#results").empty();
    if (!items || !items.length) {
      $("#results").append("<p>No results found.</p>");
      return;
    }

    items.forEach((item) => {
      const $card = $("<div>").addClass("food-card");
      $("<h3>").text(item.food_name).appendTo($card);
      $("<p>").text(item.food_description || "").appendTo($card);

      const $btnGroup = $("<div>").addClass("button-group");

      $("<button>")
        .addClass("btn details-btn")
        .text("Details")
        .click(() => {
          window.location.href = `details.html?food_id=${encodeURIComponent(
            item.food_id
          )}`;
        })
        .appendTo($btnGroup);

      // ADD TO MEAL PLAN button
      $("<button>")
        .addClass("btn add-btn")
        .text("Add to Meal Plan")
        .data("id", item.food_id)
        .click(onAddToPlan)
        .appendTo($btnGroup);

      // ADD TO FAVORITES button
      $("<button>")
        .addClass("btn fav-btn")
        .text("Add to Favorites")
        .data("id", item.food_id)
        .click(onAddToFavorites)
        .appendTo($btnGroup);

      $card.append($btnGroup);
      $("#results").append($card);
    });
  }

  // HANDLER: “Add to Meal Plan”
  function onAddToPlan() {
    const foodId = $(this).data("id");

    $.getJSON("/api/mealplan/list")
      .done(function (plans) {
        if (!plans.length) {
          alert("You have no meal plans yet. Create one first.");
          return;
        }
        // Fetch the DB-cached servings for that food
        $.getJSON(`/api/foods/${encodeURIComponent(foodId)}`)
          .done(function (res) {
            openAddToPlanModal(res.food, plans);
          })
          .fail(function (xhr) {
            if (xhr.status === 401) {
              alert("Session expired. Please sign in again.");
              window.location.href = "/SignUp.html";
            } else {
              alert("Could not fetch food details from the API.");
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
  }

  // HANDLER: “Add to Favorites”
  function onAddToFavorites() {
    const foodId = $(this).data("id");
    $.ajax({
      url: "/api/favorites",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ food_id: foodId }),
    })
      .done(() => {
        alert("Added to Favorites!");
      })
      .fail((xhr) => {
        if (xhr.status === 401) {
          alert("You must be signed in to add favorites.");
          window.location.href = "/SignUp.html";
        } else {
          alert(
            "Could not add to favorites: " +
              (xhr.responseJSON?.error || xhr.statusText)
          );
        }
      });
  }

  // “Add to Plan” MODAL
  function openAddToPlanModal(food, plans) {
    $("#add-to-plan-modal").remove();

    const $modal = $(`
      <div id="add-to-plan-modal" class="modal-overlay">
        <div class="modal">
          <h2>Add “${$("<div>").text(food.food_name).html()}” to Plan</h2>

          <label for="plan-select">Select plan:</label>
          <select id="plan-select">
            ${plans
              .map(
                (p) =>
                  `<option value="${p.plan_id}">${$("<div>").text(
                    p.name
                  ).html()}</option>`
              )
              .join("")}
          </select>

          <label for="meal-type-select">Meal type:</label>
          <select id="meal-type-select">
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>

          <label for="serving-select">Serving:</label>
          <select id="serving-select">
            ${food.servings.serving
              .map(
                (s) =>
                  `<option value="${s.serving_id}">${$("<div>").text(
                    s.serving_description
                  ).html()}</option>`
              )
              .join("")}
          </select>

          <label for="quantity-input">Quantity:</label>
          <input type="number" id="quantity-input" min="0.1" step="0.1" value="1"/>

          <div class="modal-actions">
            <button id="add-item-cancel" class="btn">Cancel</button>
            <button id="add-item-confirm" class="btn">Add</button>
          </div>
        </div>
      </div>
    `);

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
