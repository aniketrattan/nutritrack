// File: app.js
require("dotenv").config();
const pool = require("./DataBase/connection");
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
const session = require("express-session");
var logger = require("morgan");
const cors = require("cors");

const foodsRouter = require("./routes/food");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var authRouter = require("./routes/auth");
const favoritesRouter = require("./routes/favorites");
const adminRouter = require("./routes/admin");
const mealplanRouter = require("./routes/mealplan");
const showProfileRouter = require("./routes/show_profile");

var app = express();

// “ensureAuth” MIDDLEWARE
function ensureAuth(req, res, next) {
  if (req.session && req.session.user_id) {
    return next();
  }
  return res.redirect("/Login.html");
}

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // in production, set true if using HTTPS
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Any GET to pages first checks for a valid session.
app.get("/Search.html", ensureAuth, (req, res) => res.sendFile(path.join(__dirname, "public", "Search.html")));
app.get("/MealPlan.html", ensureAuth, (req, res) => res.sendFile(path.join(__dirname, "public", "MealPlan.html")));
app.get("/favorites.html", ensureAuth, (req, res) => res.sendFile(path.join(__dirname, "public", "favorites.html")));
app.get("/Profile-login.html", ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Profile-login.html"));
});
app.get("/Admin.html", ensureAuth, (req, res, next) => {
  if (req.session.role !== "admin") {
    return res.status(403).send("Forbidden");
  }
  return res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/Profile.html", ensureAuth, (req, res) => res.sendFile(path.join(__dirname, "public", "Profile.html")));

app.use(express.static(path.join(__dirname, "public")));
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/api", authRouter);
app.use("/api", foodsRouter);
app.use("/api", favoritesRouter);
app.use("/api", mealplanRouter);
app.use("/api/admin", adminRouter);
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/api", showProfileRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error", {
    title: err.status ? err.status + " Error" : "Error"
  });
});

module.exports = app;
