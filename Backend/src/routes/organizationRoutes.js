const express = require("express");
const supabase = require("../services/supabaseClient");

const router = express.Router();

/**
 * GET /api/organizations
 * Returns all registered organizations.
 * Optionally filter by org_type_id: GET /api/organizations?type=2
 */
router.get("/", async (req, res) => {
    try {
        let query = supabase
            .from("organizations")
            .select(
                "organization_id, account_id, organization_name, created_at, updated_at, org_type_id",
            )
            .order("organization_name", { ascending: true });

        const { type } = req.query;
        if (type) {
            const typeId = parseInt(type, 10);
            if (!isNaN(typeId)) {
                query = query.eq("org_type_id", typeId);
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ organizations: data ?? [] });
    } catch (err) {
        console.error("GET /api/organizations error:", err);
        res.status(500).json({ error: "Failed to load organizations" });
    }
});

module.exports = router;
