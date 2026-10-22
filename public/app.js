
const money = amount =>
    "₹" + Number(amount || 0).toLocaleString("en-IN");

async function api(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
    }

    return data;
}

function showMessage(id, text) {
    document.getElementById(id).textContent = text;
}

// Load homepage totals
async function loadDashboard() {
    if (!document.getElementById("totalMembers")) return;

    try {
        const data = await api("/api/dashboard");

        document.getElementById("totalMembers").textContent =
            data.members;
        document.getElementById("totalPlans").textContent =
            data.plans;
        document.getElementById("totalSubs").textContent =
            data.subscriptions;
        document.getElementById("totalRevenue").textContent =
            money(data.revenue);
    } catch (error) {
        console.error(error);
    }
}

// Register a new member
const memberForm = document.getElementById("memberForm");

if (memberForm) {
    memberForm.addEventListener("submit", async event => {
        event.preventDefault();

        const member = Object.fromEntries(
            new FormData(memberForm).entries()
        );

        try {
            await api("/api/members", {
                method: "POST",
                body: JSON.stringify(member)
            });

            showMessage(
                "memberMessage",
                "Member registered successfully!"
            );
            memberForm.reset();
        } catch (error) {
            showMessage("memberMessage", error.message);
        }
    });
}

// Display members
async function loadMembers() {
    const table = document.getElementById("membersTable");
    if (!table) return;

    try {
        const members = await api("/api/members");

        table.innerHTML = members.map(member => `
            <tr>
                <td>${member.member_id}</td>
                <td>${escapeHTML(member.full_name)}</td>
                <td>${escapeHTML(member.email)}</td>
                <td>${escapeHTML(member.phone)}</td>
                <td>${escapeHTML(member.gender || "-")}</td>
                <td>${escapeHTML(member.joined_on || "-")}</td>
                <td>
                    <button class="btn"
                        onclick="deleteMember(${member.member_id})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join("");

        if (!members.length) {
            table.innerHTML =
                '<tr><td colspan="7">No members registered yet.</td></tr>';
        }
    } catch (error) {
        table.innerHTML =
            '<tr><td colspan="7">Unable to load members.</td></tr>';
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

async function deleteMember(id) {
    if (!confirm("Are you sure you want to delete this member?")) {
        return;
    }

    try {
        await api("/api/members/" + id, {
            method: "DELETE"
        });

        await loadMembers();
        await loadDashboard();
    } catch (error) {
        alert(error.message);
    }
}

// Display membership plans
async function loadPlans() {
    const grid = document.getElementById("planGrid");
    if (!grid) return;

    try {
        const plans = await api("/api/membership");

        grid.innerHTML = plans.map(plan => `
            <article class="plan-card">
                <h3>${escapeHTML(plan.plan_name)}</h3>
                <h2>${money(plan.price)}</h2>
                <p>${plan.duration_months} month(s)</p>
                <p>${escapeHTML(plan.description || "")}</p>
                <a class="btn" href="subscriptions.html">
                    Choose Plan
                </a>
            </article>
        `).join("");
    } catch (error) {
        grid.textContent = error.message;
    }
}

// Add a membership plan
const planForm = document.getElementById("planForm");

if (planForm) {
    planForm.addEventListener("submit", async event => {
        event.preventDefault();

        const plan = Object.fromEntries(
            new FormData(planForm).entries()
        );

        try {
            await api("/api/membership", {
                method: "POST",
                body: JSON.stringify(plan)
            });

            showMessage("planMessage", "Plan added successfully!");
            planForm.reset();
            await loadPlans();
        } catch (error) {
            showMessage("planMessage", error.message);
        }
    });
}

// Load members and plans into subscription dropdowns
async function loadSubscriptionOptions() {
    const memberSelect = document.getElementById("subscriptionMember");
    const planSelect = document.getElementById("subscriptionPlan");

    if (!memberSelect || !planSelect) return;

    try {
        const [members, plans] = await Promise.all([
            api("/api/members"),
            api("/api/membership")
        ]);

        memberSelect.innerHTML =
            '<option value="">Select member</option>' +
            members.map(member =>
                `<option value="${member.member_id}">
                    ${escapeHTML(member.full_name)}
                </option>`
            ).join("");

        planSelect.innerHTML =
            '<option value="">Select plan</option>' +
            plans.map(plan =>
                `<option value="${plan.membership_id}">
                    ${escapeHTML(plan.plan_name)}
                    — ${money(plan.price)}
                </option>`
            ).join("");
    } catch (error) {
        showMessage("subscriptionMessage", error.message);
    }
}

// Create a subscription
const subscriptionForm =
    document.getElementById("subscriptionForm");

if (subscriptionForm) {
    subscriptionForm.addEventListener("submit", async event => {
        event.preventDefault();

        const subscription = Object.fromEntries(
            new FormData(subscriptionForm).entries()
        );

        try {
            await api("/api/subscriptions", {
                method: "POST",
                body: JSON.stringify(subscription)
            });

            showMessage(
                "subscriptionMessage",
                "Subscription saved successfully!"
            );

            subscriptionForm.reset();
            await loadSubscriptions();
            await loadDashboard();
        } catch (error) {
            showMessage("subscriptionMessage", error.message);
        }
    });
}

// Display subscriptions
async function loadSubscriptions() {
    const table = document.getElementById("subscriptionsTable");
    if (!table) return;

    try {
        const subscriptions = await api("/api/subscriptions");

        table.innerHTML = subscriptions.map(sub => `
            <tr>
                <td>${sub.subscription_id}</td>
                <td>${escapeHTML(sub.full_name)}</td>
                <td>${escapeHTML(sub.plan_name)}</td>
                <td>${escapeHTML(sub.start_date)}</td>
                <td>${escapeHTML(sub.end_date)}</td>
                <td>${money(sub.amount_paid)}</td>
                <td>${escapeHTML(sub.payment_status)}</td>
            </tr>
        `).join("");

        if (!subscriptions.length) {
            table.innerHTML =
                '<tr><td colspan="7">No subscriptions yet.</td></tr>';
        }
    } catch (error) {
        table.innerHTML =
            '<tr><td colspan="7">Unable to load subscriptions.</td></tr>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    loadMembers();
    loadPlans();
    loadSubscriptionOptions();
    loadSubscriptions();
});
