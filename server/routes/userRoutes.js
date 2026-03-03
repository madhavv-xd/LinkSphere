const verifyToken = require("../middleware/authMiddleware");
const express = require("express");
const router = express.Router();
const { login, signup, getUser } = require("../controllers/userController");
const userController = require("../controllers/userController");

// POST /api/users/login
router.post("/login", userController.login);

// POST /api/users/signup
router.post("/signup", userController.signup);

// GET /api/users/:id
router.get("/:id", verifyToken, userController.getUser);

router.put("/:id", verifyToken, userController.updateUser);

module.exports = router;