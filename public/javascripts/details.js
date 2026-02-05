$(function () {
  const params = new URLSearchParams(window.location.search);
  const foodId = params.get("food_id");

  if (params.get("source") === "db") {
    $("#fav-btn").hide();
  }

  if (!foodId) {
    $("#nutrition-body").html(
      '<tr><td colspan="2" class="error">No food selected.</td></tr>'
    );
    return;
  }

  const useDb = params.get("source") === "db";
  const endpoint = useDb
    ? `/api/db/foods/${foodId}`
    : `/api/foods/${foodId}`;

  $("#nutrition-body").html(
    '<tr><td colspan="2">Loading nutrition data…</td></tr>'
  );

  $.getJSON(endpoint)
    .done((data) => {
      $("#food-name").text(data.food.food_name);

      const rawServ = data.food.servings.serving;
      const servings = Array.isArray(rawServ) ? rawServ : [rawServ];
      const $sel = $("#servingSelect").empty();
      servings.forEach((s) => {
        $sel.append(
          `<option value="${s.serving_id}">${s.serving_description}</option>`
        );
      });

      function showServing(s) {
        const fields = [
          ["Serving Size", s.serving_description],
          ["Calories", `${s.calories} kcal`],
          ["Total Fat", `${s.fat} g`],
          ["Saturated Fat", `${s.saturated_fat} g`],
          ["Monounsaturated Fat", `${s.monounsaturated_fat} g`],
          ["Polyunsaturated Fat", `${s.polyunsaturated_fat} g`],
          ["Carbohydrate", `${s.carbohydrate} g`],
          ["Fiber", `${s.fiber} g`],
          ["Sugar", `${s.sugar} g`],
          ["Protein", `${s.protein} g`],
          ["Cholesterol", `${s.cholesterol} mg`],
          ["Sodium", `${s.sodium} mg`],
          ["Calcium", `${s.calcium} mg`],
          ["Iron", `${s.iron} mg`],
          ["Potassium", `${s.potassium} mg`],
          ["Vitamin A", `${s.vitamin_a} µg`],
          ["Vitamin C", `${s.vitamin_c} mg`],
        ];

        $("#nutrition-body").empty();
        fields.forEach(([name, value]) => {
          $("#nutrition-body").append(
            `<tr><th>${name}</th><td>${value}</td></tr>`
          );
        });

        updateMacros(s);
      }

      function updateMacros(s) {
        const prot = parseFloat(s.protein),
          fat = parseFloat(s.fat),
          carbsTot = parseFloat(s.carbohydrate),
          fiber = parseFloat(s.fiber),
          carbsNet = carbsTot - fiber;

        const protCal = prot * 4,
          fatCal = fat * 9,
          carbCal = carbsNet * 4;
        const totalMacroCal = protCal + fatCal + carbCal;

        const pPerc = (protCal / totalMacroCal) * 100,
          fPerc = (fatCal / totalMacroCal) * 100,
          cPerc = (carbCal / totalMacroCal) * 100;

        const chart = document.getElementById("macro-chart");
        chart.style.background = `
          conic-gradient(
            var(--carb-color)    0%    ${cPerc}%,
            var(--protein-color) ${cPerc}% ${cPerc + pPerc}%,
            var(--fat-color)     ${cPerc + pPerc}% 100%
          )
        `;

        document.getElementById("macro-total").textContent = `${parseFloat(
          s.calories
        )} kcal`;
        document.getElementById("macro-carbs").innerHTML = `${carbsNet.toFixed(
          1
        )} g <span class="macro-percent">(${cPerc.toFixed(0)}%)</span>`;
        document.getElementById("macro-protein").innerHTML = `${prot.toFixed(
          2
        )} g <span class="macro-percent">(${pPerc.toFixed(0)}%)</span>`;
        document.getElementById("macro-fat").innerHTML = `${fat.toFixed(
          2
        )} g <span class="macro-percent">(${fPerc.toFixed(0)}%)</span>`;
      }

      showServing(servings[0]);
      $sel.on("change", () => {
        const serv = servings.find((x) => x.serving_id === $sel.val());
        showServing(serv);
      });

      $("#fav-btn").on("click", function () {
        $.ajax({
          url: "/api/favorites",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({ food_id: foodId }),
        })
          .done(() => alert("Added to Favorites!"))
          .fail((e) => alert("Could not add favorite: " + e.responseText));
      });
    })
    .fail(() => {
      $("#nutrition-body").html(
        '<tr><td colspan="2" class="error">Failed to load nutrition data.</td></tr>'
      );
    });
});
