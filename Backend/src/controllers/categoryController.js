const supabase = require("../services/supabaseClient");

// ─────────────────────────────────────────────────────────────
//  GET /api/categories
//  Returns all default categories + user's custom categories
// ─────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
    try {
        const userId = req.account.account_id;

        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .or(`user_id.is.null,user_id.eq.${userId}`)
            .order("is_default", { ascending: false })
            .order("name");

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[getCategories]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/categories
//  Create a custom category for the logged-in user
// ─────────────────────────────────────────────────────────────
const createCategory = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { name, icon, color } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Category name is required." });
        }
        if (name.trim().length > 80) {
            return res.status(400).json({ success: false, message: "Category name must be 80 characters or fewer." });
        }
        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return res.status(400).json({ success: false, message: "Color must be a valid hex color (e.g. #FF5733)." });
        }

        const { data, error } = await supabase
            .from("categories")
            .insert({
                user_id: userId,
                name: name.trim(),
                icon: icon || "tag",
                color: color || "#6366F1",
                is_default: false,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({ success: false, message: "A category with this name already exists." });
            }
            throw error;
        }

        return res.status(201).json({ success: true, data });
    } catch (err) {
        console.error("[createCategory]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  PUT /api/categories/:id
//  Update a custom category (must be owned by user)
// ─────────────────────────────────────────────────────────────
const updateCategory = async (req, res) => {
    try {
        const userId     = req.account.account_id;
        const categoryId = req.params.id;
        const { name, icon, color } = req.body;

        // Confirm ownership — default categories cannot be edited
        const { data: existing, error: fetchError } = await supabase
            .from("categories")
            .select("*")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }

        const updates = {};
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim().length === 0)
                return res.status(400).json({ success: false, message: "Category name cannot be empty." });
            if (name.trim().length > 80)
                return res.status(400).json({ success: false, message: "Category name must be 80 characters or fewer." });
            updates.name = name.trim();
        }
        if (icon  !== undefined) updates.icon  = icon;
        if (color !== undefined) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(color))
                return res.status(400).json({ success: false, message: "Color must be a valid hex color." });
            updates.color = color;
        }

        const { data, error } = await supabase
            .from("categories")
            .update(updates)
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("[updateCategory]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/categories/:id
//  Delete a custom category (must be owned by user)
// ─────────────────────────────────────────────────────────────
const deleteCategory = async (req, res) => {
    try {
        const userId     = req.account.account_id;
        const categoryId = req.params.id;

        const { data: existing } = await supabase
            .from("categories")
            .select("category_id")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }

        const { error } = await supabase
            .from("categories")
            .delete()
            .eq("category_id", categoryId)
            .eq("user_id", userId);

        if (error) throw error;
        return res.status(200).json({ success: true, message: "Category deleted successfully." });
    } catch (err) {
        console.error("[deleteCategory]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };