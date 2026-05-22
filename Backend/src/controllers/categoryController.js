const supabase = require("../services/supabaseClient");

const CATEGORY_ICON_BUCKET = "category-icons";
const MAX_ICON_SIZE_BYTES  = 2 * 1024 * 1024; // 2 MB
// Custom user icons are PNG/JPEG/WEBP only — SVG is reserved for admin-managed defaults
const ALLOWED_ICON_TYPES   = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// ─────────────────────────────────────────────────────────────
//  GET /api/categories
//  Returns all default categories + user's custom categories
// ─────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {
    try {
        const userId = req.account.account_id;

        const { data, error } = await supabase
            .from("categories")
            .select("category_id, user_id, name, icon_url, icon_type, color, is_default, created_at, updated_at")
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
//  Create a custom category for the logged-in user.
//  Icon is optional at creation — they can upload one separately
//  via POST /api/categories/:id/icon
// ─────────────────────────────────────────────────────────────
const createCategory = async (req, res) => {
    try {
        const userId = req.account.account_id;
        const { name, color } = req.body;

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
                user_id:    userId,
                name:       name.trim(),
                icon_url:   null,       // set later via POST /categories/:id/icon
                icon_type:  "png",      // user-uploaded icons are always PNG
                color:      color || "#6366F1",
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
//  Update a custom category (must be owned by user).
//  name and color only — icon is managed via /icon endpoints.
// ─────────────────────────────────────────────────────────────
const updateCategory = async (req, res) => {
    try {
        const userId     = req.account.account_id;
        const categoryId = req.params.id;
        const { name, color } = req.body;

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
            .select("category_id, icon_url, icon_type")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }

        // Find the "Others" default category to reassign expenses to
        const { data: othersCategory } = await supabase
            .from("categories")
            .select("category_id")
            .eq("name", "Other")
            .is("user_id", null)       // default categories have no user_id
            .eq("is_default", true)
            .maybeSingle();

        if (othersCategory) {
            // Reassign all expenses using this category to "Others"
            await supabase
                .from("expenses")
                .update({ category_id: othersCategory.category_id })
                .eq("category_id", categoryId);
        }

        // Clean up storage file if one was uploaded
        if (existing.icon_url && existing.icon_type === "png") {
            const storagePath = _extractStoragePath(existing.icon_url, CATEGORY_ICON_BUCKET);
            if (storagePath) {
                await supabase.storage.from(CATEGORY_ICON_BUCKET).remove([storagePath]);
            }
        }

        const { error } = await supabase
            .from("categories")
            .delete()
            .eq("category_id", categoryId)
            .eq("user_id", userId);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: othersCategory
                ? `Category deleted. Its expenses have been moved to "Others".`
                : "Category deleted successfully.",
        });
    } catch (err) {
        console.error("[deleteCategory]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/categories/:id/icon
//  Upload a PNG/JPEG icon for a custom (user-owned) category.
//
//  Body (JSON): { file_base64: "<base64>", mime_type: "image/png" }
//
//  - Only custom categories can have uploaded icons.
//  - Default categories use admin-managed SVGs — cannot be overridden.
//  - Stores file at: category-icons/<userId>/<categoryId>.png
//  - Updates icon_url and confirms icon_type = 'png'.
//  - Returns { success, icon_url }
// ─────────────────────────────────────────────────────────────
const uploadCategoryIcon = async (req, res) => {
    try {
        const userId     = req.account.account_id;
        const categoryId = req.params.id;
        const { file_base64, mime_type } = req.body;

        if (!file_base64 || !mime_type) {
            return res.status(400).json({ success: false, message: "file_base64 and mime_type are required." });
        }

        if (!ALLOWED_ICON_TYPES.includes(mime_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid file type. Allowed: ${ALLOWED_ICON_TYPES.join(", ")}. Custom icons must be PNG, JPEG, or WEBP.`,
            });
        }

        // Verify ownership — only user-owned (non-default) categories can have uploaded icons
        const { data: existing, error: fetchError } = await supabase
            .from("categories")
            .select("category_id, is_default")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }
        if (existing.is_default) {
            return res.status(403).json({ success: false, message: "Default categories cannot have custom icons." });
        }

        // Decode and size-check
        const fileBuffer = Buffer.from(file_base64, "base64");
        if (fileBuffer.byteLength > MAX_ICON_SIZE_BYTES) {
            return res.status(400).json({ success: false, message: "File too large. Maximum size is 2 MB." });
        }

        // Always store as the same extension so upsert overwrites cleanly
        const ext         = _mimeToExt(mime_type);
        const storagePath = `${userId}/${categoryId}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(CATEGORY_ICON_BUCKET)
            .upload(storagePath, fileBuffer, {
                contentType: mime_type,
                upsert:      true,
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from(CATEGORY_ICON_BUCKET)
            .getPublicUrl(storagePath);

        // Cache-bust so the browser picks up the new image
        const iconUrl = `${publicUrl}?v=${Date.now()}`;

        const { error: updateError } = await supabase
            .from("categories")
            .update({ icon_url: iconUrl, icon_type: "png" })
            .eq("category_id", categoryId)
            .eq("user_id", userId);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true, icon_url: iconUrl });
    } catch (err) {
        console.error("[uploadCategoryIcon]", err);
        return res.status(500).json({ success: false, message: "Failed to upload category icon.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE /api/categories/:id/icon
//  Remove the uploaded icon — category reverts to no icon (null).
// ─────────────────────────────────────────────────────────────
const deleteCategoryIcon = async (req, res) => {
    try {
        const userId     = req.account.account_id;
        const categoryId = req.params.id;

        const { data: existing, error: fetchError } = await supabase
            .from("categories")
            .select("category_id, icon_url, icon_type")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }

        // Delete all possible extension variants from storage
        const exts  = ["jpg", "png", "webp"];
        const paths = exts.map(e => `${userId}/${categoryId}.${e}`);
        await supabase.storage.from(CATEGORY_ICON_BUCKET).remove(paths);

        // Clear icon_url — frontend will show the default placeholder
        await supabase
            .from("categories")
            .update({ icon_url: null, icon_type: "png" })
            .eq("category_id", categoryId)
            .eq("user_id", userId);

        return res.status(200).json({ success: true, message: "Category icon removed." });
    } catch (err) {
        console.error("[deleteCategoryIcon]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  Private helpers
// ─────────────────────────────────────────────────────────────
function _mimeToExt(mime) {
    const map = {
        "image/jpeg": "jpg",
        "image/jpg":  "jpg",
        "image/png":  "png",
        "image/webp": "webp",
    };
    return map[mime] || "png";
}

function _extractStoragePath(url, bucketId) {
    try {
        const marker = `/object/public/${bucketId}/`;
        const idx    = url.indexOf(marker);
        if (idx === -1) return null;
        return url.slice(idx + marker.length).split("?")[0];
    } catch {
        return null;
    }
}

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryIcon,
    deleteCategoryIcon,
};