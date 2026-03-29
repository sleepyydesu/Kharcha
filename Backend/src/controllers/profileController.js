const supabase = require("../services/supabaseClient");

const PROFILE_PICTURE_BUCKET = "profile-pictures";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// ─────────────────────────────────────────────────────────────
//  GET PROFILE
//  GET /api/profile
//  Returns the authenticated account's profile data
// ─────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const { account_id, account_type, email } = req.account;

        // Fetch base account info (includes shared profile picture)
        const { data: account, error: accountError } = await supabase
            .from("accounts")
            .select("account_id, account_type, email, phone_number, is_verified, is_active, created_at, profile_picture_url")
            .eq("account_id", account_id)
            .single();

        if (accountError) throw accountError;

        // Fetch type-specific profile
        let profile = null;
        if (account_type === "user") {
            const { data } = await supabase
                .from("users")
                .select("full_name")
                .eq("account_id", account_id)
                .single();
            profile = data;
        } else if (account_type === "organization") {
            const { data } = await supabase
                .from("organizations")
                .select("organization_name, org_type_id, organization_types(name)")
                .eq("account_id", account_id)
                .single();
            profile = data;
        } else if (account_type === "admin") {
            const { data } = await supabase
                .from("admins")
                .select("full_name")
                .eq("account_id", account_id)
                .single();
            profile = data;
        }

        // Fetch wallet balance
        const { data: wallet } = await supabase
            .from("wallets")
            .select("balance, currency")
            .eq("account_id", account_id)
            .maybeSingle();

        return res.status(200).json({
            success: true,
            profile: {
                account_id:          account.account_id,
                account_type:        account.account_type,
                email:               account.email,
                phone_number:        account.phone_number,
                is_verified:         account.is_verified,
                is_active:           account.is_active,
                created_at:          account.created_at,
                profile_picture_url: account.profile_picture_url || null,
                ...buildProfileFields(account_type, profile),
                wallet: wallet
                    ? { balance: parseFloat(wallet.balance), currency: wallet.currency }
                    : null,
            },
        });
    } catch (err) {
        console.error("[getProfile]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

/** Normalize profile fields by account type */
function buildProfileFields(account_type, profile) {
    if (!profile) return {};
    if (account_type === "user" || account_type === "admin") {
        return {
            full_name: profile.full_name || null,
        };
    }
    if (account_type === "organization") {
        return {
            organization_name: profile.organization_name || null,
            org_type_id:       profile.org_type_id || null,
            org_type_name:     profile.organization_types?.name || null,
        };
    }
    return {};
}

// ─────────────────────────────────────────────────────────────
//  UPLOAD PROFILE PICTURE
//  POST /api/profile/picture
//
//  Expects multipart/form-data with a field "file" (image).
//  Uses Supabase Storage to store and serve the image.
//
//  IMPORTANT: This endpoint receives the raw file as base64 in
//  the request body because we're not using multer (no extra package).
//  Frontend should send: { file_base64: "<base64>", mime_type: "image/jpeg" }
//
//  For production, consider adding multer for multipart handling.
// ─────────────────────────────────────────────────────────────
const uploadProfilePicture = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { file_base64, mime_type } = req.body;

        if (!file_base64 || !mime_type) {
            return res.status(400).json({
                success: false,
                message: "file_base64 and mime_type are required.",
            });
        }

        if (!ALLOWED_MIME_TYPES.includes(mime_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}.`,
            });
        }

        // Decode base64
        const fileBuffer = Buffer.from(file_base64, "base64");

        if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
            return res.status(400).json({
                success: false,
                message: "File too large. Maximum size is 5 MB.",
            });
        }

        // Build storage path: <account_id>/profile.<ext>
        const ext = mime_type.split("/")[1].replace("jpeg", "jpg");
        const storagePath = `${account_id}/profile.${ext}`;

        // Upload (upsert) to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(PROFILE_PICTURE_BUCKET)
            .upload(storagePath, fileBuffer, {
                contentType: mime_type,
                upsert: true,  // overwrite existing
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(PROFILE_PICTURE_BUCKET)
            .getPublicUrl(storagePath);

        // Add cache-busting timestamp to the URL
        const profilePictureUrl = `${publicUrl}?v=${Date.now()}`;

        // Update accounts table — profile picture is shared across all account types
        const { error: updateError } = await supabase
            .from("accounts")
            .update({ profile_picture_url: profilePictureUrl })
            .eq("account_id", account_id);

        if (updateError) throw updateError;

        return res.status(200).json({
            success: true,
            message: "Profile picture updated successfully.",
            profile_picture_url: profilePictureUrl,
        });
    } catch (err) {
        console.error("[uploadProfilePicture]", err);
        return res.status(500).json({ success: false, message: "Failed to upload profile picture.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE PROFILE PICTURE
//  DELETE /api/profile/picture
// ─────────────────────────────────────────────────────────────
const deleteProfilePicture = async (req, res) => {
    try {
        const { account_id } = req.account;

        // Try all common extensions
        const exts = ["jpg", "png", "webp"];
        for (const ext of exts) {
            await supabase.storage
                .from(PROFILE_PICTURE_BUCKET)
                .remove([`${account_id}/profile.${ext}`]);
        }

        // Clear profile picture on accounts table — shared across all account types
        await supabase
            .from("accounts")
            .update({ profile_picture_url: null })
            .eq("account_id", account_id);

        return res.status(200).json({ success: true, message: "Profile picture removed." });
    } catch (err) {
        console.error("[deleteProfilePicture]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  UPDATE PROFILE
//  PATCH /api/profile
//  For users:  { full_name }
//  For orgs:   { organization_name, org_type_id }
//  For phone:  { phone_number }  (shared — on accounts table)
// ─────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { account_id, account_type } = req.account;
        const { full_name, organization_name, org_type_id, phone_number } = req.body;

        // Update phone on accounts table if provided
        if (phone_number !== undefined) {
            // Check uniqueness first
            const { data: existing } = await supabase
                .from("accounts")
                .select("account_id")
                .eq("phone_number", phone_number.trim())
                .neq("account_id", account_id)
                .maybeSingle();

            if (existing) {
                return res.status(409).json({
                    success: false,
                    field: "phone_number",
                    message: "This phone number is already in use.",
                });
            }

            await supabase
                .from("accounts")
                .update({ phone_number: phone_number.trim() })
                .eq("account_id", account_id);
        }

        // Update type-specific fields
        if (account_type === "user" && full_name !== undefined) {
            await supabase
                .from("users")
                .update({ full_name: full_name.trim() })
                .eq("account_id", account_id);
        }

        if (account_type === "admin" && full_name !== undefined) {
            await supabase
                .from("admins")
                .update({ full_name: full_name.trim() })
                .eq("account_id", account_id);
        }

        if (account_type === "organization") {
            const orgUpdates = {};
            if (organization_name !== undefined) orgUpdates.organization_name = organization_name.trim();
            if (org_type_id       !== undefined) orgUpdates.org_type_id       = org_type_id;

            if (Object.keys(orgUpdates).length > 0) {
                await supabase
                    .from("organizations")
                    .update(orgUpdates)
                    .eq("account_id", account_id);
            }
        }

        return res.status(200).json({ success: true, message: "Profile updated successfully." });
    } catch (err) {
        console.error("[updateProfile]", err);
        return res.status(500).json({ success: false, message: "Server error.", error: err.message });
    }
};

module.exports = {
    getProfile,
    uploadProfilePicture,
    deleteProfilePicture,
    updateProfile,
};
