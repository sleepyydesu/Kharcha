const express = require("express");
const supabase = require("../services/supabaseClient");

const router = express.Router();

router.get("/db-test", async (req, res) => {
    try {
        const { data, error } = await supabase.from("test").select("*");

        if (error) throw error;

        res.json({
            success: true,
            message: "Database connected successfully ✅",
            data: data,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Database connection failed ❌",
            error: err.message,
        });
    }
});

module.exports = router;
