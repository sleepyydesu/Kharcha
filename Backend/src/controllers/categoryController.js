const supabase = require("../services/supabaseClient");

const CATEGORY_ICON_BUCKET = "category-icons";
const MAX_ICON_SIZE_BYTES  = 2 * 1024 * 1024; // 2 MB
const ALLOWED_ICON_TYPES   = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

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
                user_id:    userId,
                name:       name.trim(),
                icon:       icon || "tag",   // can be emoji name OR a storage URL
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
            .select("category_id, icon")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }

        // If the icon is a Storage URL, delete the file too
        if (existing.icon && existing.icon.includes(CATEGORY_ICON_BUCKET)) {
            const storagePath = _extractStoragePath(existing.icon, CATEGORY_ICON_BUCKET);
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
        return res.status(200).json({ success: true, message: "Category deleted successfully." });
    } catch (err) {
        console.error("[deleteCategory]", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/categories/:id/icon
//  Upload an image icon for a custom category.
//
//  Body (JSON): { file_base64: "<base64>", mime_type: "image/png" }
//
//  - Validates ownership (default categories cannot be changed).
//  - Stores file at: category-icons/<userId>/<categoryId>.<ext>
//  - Updates categories.icon with the public URL.
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
                message: `Invalid file type. Allowed: ${ALLOWED_ICON_TYPES.join(", ")}.`,
            });
        }

        // Verify ownership — only custom (user-owned) categories can have uploaded icons
        const { data: existing, error: fetchError } = await supabase
            .from("categories")
            .select("category_id")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }

        // Decode and size-check
        const fileBuffer = Buffer.from(file_base64, "base64");
        if (fileBuffer.byteLength > MAX_ICON_SIZE_BYTES) {
            return res.status(400).json({ success: false, message: "File too large. Maximum size is 2 MB." });
        }

        // Storage path: <userId>/<categoryId>.<ext>
        const ext         = _mimeToExt(mime_type);
        const storagePath = `${userId}/${categoryId}.${ext}`;

        // Upload (upsert — overwrites previous icon for this category)
        const { error: uploadError } = await supabase.storage
            .from(CATEGORY_ICON_BUCKET)
            .upload(storagePath, fileBuffer, {
                contentType: mime_type,
                upsert:      true,
            });

        if (uploadError) throw uploadError;

        // Build public URL with cache-bust
        const { data: { publicUrl } } = supabase.storage
            .from(CATEGORY_ICON_BUCKET)
            .getPublicUrl(storagePath);

        const iconUrl = `${publicUrl}?v=${Date.now()}`;

        // Persist URL back to the categories row
        const { error: updateError } = await supabase
            .from("categories")
            .update({ icon: iconUrl })
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
//  Remove the uploaded icon and revert to the default "tag" icon.
// ─────────────────────────────────────────────────────────────
const deleteCategoryIcon = async (req, res) => {
    try {
        const userId     = req.account.account_id;
        const categoryId = req.params.id;

        const { data: existing, error: fetchError } = await supabase
            .from("categories")
            .select("category_id, icon")
            .eq("category_id", categoryId)
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) {
            return res.status(404).json({ success: false, message: "Category not found or not owned by you." });
        }

        // Delete all known extensions from storage (upsert may have changed ext)
        const exts = ["jpg", "png", "webp", "svg"];
        const paths = exts.map(e => `${userId}/${categoryId}.${e}`);
        await supabase.storage.from(CATEGORY_ICON_BUCKET).remove(paths);

        // Revert icon field to the default text token
        await supabase
            .from("categories")
            .update({ icon: "tag" })
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
        "image/jpeg":     "jpg",
        "image/jpg":      "jpg",
        "image/png":      "png",
        "image/webp":     "webp",
        "image/svg+xml":  "svg",
    };
    return map[mime] || "jpg";
}

/**
 * Extracts the storage path from a full public URL.
 * e.g. "https://<project>.supabase.co/storage/v1/object/public/category-icons/abc/123.png?v=..."
 * → "abc/123.png"
 */
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