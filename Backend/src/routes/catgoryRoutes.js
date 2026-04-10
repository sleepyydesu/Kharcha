// ── categoryRoutes.js ─────────────────────────────────────────
const router = require("express").Router();
const { authenticate } = require("../middleware/authmiddleware");
const { getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

router.get("/",        authenticate, getCategories);
router.post("/",       authenticate, createCategory);
router.put("/:id",     authenticate, updateCategory);
router.delete("/:id",  authenticate, deleteCategory);

module.exports = router;