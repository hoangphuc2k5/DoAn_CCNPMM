const express = require("express");
const {
  createUser,
  handleLogin,
  getUser,
  getAccount,
  getProfile,
  updateProfile,
} = require("../controllers/userController");
const auth = require("../middleware/auth");
const delay = require("../middleware/delay");
const express = require('express');
const { createUser, handleLogin, getUser,
    getAccount, forgotPassword
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const delay = require('../middleware/delay');

const routerAPI = express.Router();

routerAPI.all("*", auth);

routerAPI.get("/", (req, res) => {
  return res.status(200).json("Hello world api");
});

routerAPI.post("/register", createUser);
routerAPI.post("/login", handleLogin);
routerAPI.post("/forgot-password", forgotPassword);

routerAPI.get("/user", getUser);
routerAPI.get("/account", delay, getAccount);

// Profile routes
routerAPI.get("/profile", delay, getProfile);
routerAPI.put("/profile", updateProfile);

module.exports = routerAPI; //export default
