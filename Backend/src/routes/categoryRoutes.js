// ── catgoryRoutes.js ──────────────────────────────────────────
const router = require("express").Router();
const { authenticate } = require("../middleware/authmiddleware");
const {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryIcon,
    deleteCategoryIcon,
} = require("../controllers/categoryController");

// CRUD
router.get("/",        authenticate, getCategories);
router.post("/",       authenticate, createCategory);
router.put("/:id",     authenticate, updateCategory);
router.delete("/:id",  authenticate, deleteCategory);

// Icon upload / removal  (custom categories only)
router.post("/:id/icon",   authenticate, uploadCategoryIcon);
router.delete("/:id/icon", authenticate, deleteCategoryIcon);

module.exports = router;