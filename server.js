
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// =======================================
// STEP 4: MIDDLEWARE AND STATIC FILES
// =======================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IMPORTANT:
// Serve HTML, CSS and JavaScript files from public.
// This must appear BEFORE the fallback route at the bottom.
app.use(express.static(path.join(__dirname, "public")));

// =======================================
// DATABASE CONNECTION
// =======================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "moukthika_fitlife",
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
});

// Check database connection
pool.getConnection()
    .then(connection => {
        console.log("MySQL database connected successfully!");
        connection.release();
    })
    .catch(error => {
        console.error("MySQL connection failed:", error.message);
    });

// =======================================
// DASHBOARD STATISTICS
// =======================================

app.get("/api/dashboard", async (req, res) => {
    try {
        const [[members]] = await pool.query(
            "SELECT COUNT(*) AS total FROM members"
        );

        const [[plans]] = await pool.query(
            "SELECT COUNT(*) AS total FROM membership"
        );

        const [[subs]] = await pool.query(
            "SELECT COUNT(*) AS total FROM subscription"
        );

        const [[revenue]] = await pool.query(
            "SELECT COALESCE(SUM(amount_paid), 0) AS total FROM subscription"
        );

        res.json({
            members: members.total,
            plans: plans.total,
            subscriptions: subs.total,
            revenue: revenue.total
        });
    } catch (error) {
        console.error("Dashboard error:", error.message);
        res.status(500).json({ error: "Database error" });
    }
});

// =======================================
// GET ALL MEMBERS
// =======================================

app.get("/api/members", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM members ORDER BY member_id DESC"
        );

        res.json(rows);
    } catch (error) {
        console.error("Load members error:", error.message);
        res.status(500).json({
            error: "Unable to load members"
        });
    }
});

// =======================================
// REGISTER A MEMBER
// =======================================

app.post("/api/members", async (req, res) => {
    const {
        full_name,
        email,
        phone,
        gender,
        date_of_birth,
        joined_on
    } = req.body;

    if (!full_name || !email || !phone) {
        return res.status(400).json({
            error: "Name, email and phone are required"
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO members
            (full_name, email, phone, gender, date_of_birth, joined_on)
            VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE))`,
            [
                full_name.trim(),
                email.trim(),
                phone.trim(),
                gender || null,
                date_of_birth || null,
                joined_on || null
            ]
        );

        res.status(201).json({
            message: "Member registered successfully",
            member_id: result.insertId
        });
    } catch (error) {
        console.error("Register member error:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "This email is already registered"
            });
        }

        res.status(500).json({
            error: "Unable to register member. Check the database connection and table columns."
        });
    }
});

// =======================================
// DELETE A MEMBER
// =======================================

app.delete("/api/members/:id", async (req, res) => {
    try {
        const [result] = await pool.execute(
            "DELETE FROM members WHERE member_id = ?",
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                error: "Member not found"
            });
        }

        res.json({
            message: "Member deleted successfully"
        });
    } catch (error) {
        console.error("Delete member error:", error.message);
        res.status(500).json({
            error: "Unable to delete member"
        });
    }
});

// =======================================
// GET MEMBERSHIP PLANS
// =======================================

app.get("/api/membership", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT membership_id, plan_name,
                    duration_months, price, description
             FROM membership
             ORDER BY price`
        );

        res.json(rows);
    } catch (error) {
        console.error("Load plans error:", error.message);
        res.status(500).json({
            error: "Unable to load membership plans"
        });
    }
});

// =======================================
// ADD A MEMBERSHIP PLAN
// =======================================

app.post("/api/membership", async (req, res) => {
    const {
        plan_name,
        duration_months,
        price,
        description
    } = req.body;

    if (
        !plan_name ||
        !Number.isInteger(Number(duration_months)) ||
        Number(duration_months) < 1 ||
        price === undefined ||
        price === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
    ) {
        return res.status(400).json({
            error: "Enter a plan name, valid duration and price"
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO membership
            (plan_name, duration_months, price, description)
            VALUES (?, ?, ?, ?)`,
            [
                plan_name.trim(),
                Number(duration_months),
                Number(price),
                description || ""
            ]
        );

        res.status(201).json({
            message: "Membership plan added successfully",
            membership_id: result.insertId
        });
    } catch (error) {
        console.error("Add plan error:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "A plan with this name already exists"
            });
        }

        res.status(500).json({
            error: "Unable to add membership plan"
        });
    }
});

// =======================================
// GET SUBSCRIPTIONS
// =======================================

app.get("/api/subscriptions", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                s.*,
                m.full_name,
                p.plan_name
            FROM subscription AS s
            JOIN members AS m
                ON s.member_id = m.member_id
            JOIN membership AS p
                ON s.membership_id = p.membership_id
            ORDER BY s.subscription_id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error("Load subscriptions error:", error.message);
        res.status(500).json({
            error: "Unable to load subscriptions"
        });
    }
});

// =======================================
// CREATE A SUBSCRIPTION
// =======================================

app.post("/api/subscriptions", async (req, res) => {
    const {
        member_id,
        membership_id,
        start_date,
        end_date,
        amount_paid,
        payment_status
    } = req.body;

    if (!member_id || !membership_id || !start_date || !end_date) {
        return res.status(400).json({
            error: "Select a member, plan and both dates"
        });
    }

    if (end_date < start_date) {
        return res.status(400).json({
            error: "End date cannot be before start date"
        });
    }

    const amount = Number(amount_paid || 0);
    const validStatuses = ["Paid", "Pending", "Partial"];

    if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({
            error: "Enter a valid amount paid"
        });
    }

    if (
        payment_status &&
        !validStatuses.includes(payment_status)
    ) {
        return res.status(400).json({
            error: "Invalid payment status"
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO subscription
            (member_id, membership_id, start_date, end_date,
             amount_paid, payment_status)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                Number(member_id),
                Number(membership_id),
                start_date,
                end_date,
                amount,
                payment_status || "Pending"
            ]
        );

        res.status(201).json({
            message: "Subscription created successfully",
            subscription_id: result.insertId
        });
    } catch (error) {
        console.error("Create subscription error:", error.message);
        res.status(500).json({
            error: "Unable to create subscription. Check the selected member, plan and database tables."
        });
    }
});

// =======================================
// STEP 4: PAGE FALLBACK
// =======================================

// Keep this AFTER express.static and all API routes.
// Existing HTML files are served by express.static.
// This fallback sends the homepage for unmatched page requests.
app.get("*path", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// =======================================
// START THE SERVER
// =======================================

app.listen(PORT, () => {
    console.log(
        `Moukthika Fitlife running at http://localhost:${PORT}`
    );
});
