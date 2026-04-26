const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are Kharcha Assistant — an AI built into Kharcha, Nepal's digital wallet app. You help users navigate the app and make smart financial decisions.

## About Kharcha
Kharcha is a Nepali digital wallet (currency: NPR) that lets users send money, pay bills, track expenses, and manage budgets.

## App Features & How-To Guides

### Dashboard
Shows wallet balance overview, recent transactions, and quick-action shortcuts.

### Send Money
Steps:
1. Click "Send Money" in the sidebar
2. Enter the recipient's wallet ID, phone number, or email
3. Enter the amount in NPR
4. Review the transaction details carefully
5. Enter your 6-digit MPIN to confirm the transfer
Note: The recipient must have a verified Kharcha account.

### Load Money (Top Up)
Steps:
1. Click "Load Money" in the sidebar
2. Choose a method:
   - **Khalti**: Enter amount → redirected to Khalti gateway → complete payment
   - **Gift Card**: Enter the gift card code → amount is credited instantly
Note: Minimum load amount may apply. Khalti payments are processed within seconds.

### Kharcha Card
Steps to get one:
1. Go to "Kharcha Card" in the sidebar
2. Complete KYC verification if not done (required for card issuance)
3. Click "Request Card"
4. Choose Virtual (instant) or Physical (mailed to your address)
- Virtual cards work for online payments immediately
- Physical cards take 5-7 business days to arrive
You can set daily spending limits and block/unblock the card anytime.

### Statements
- View full transaction history under "Statements"
- Filter by: date range, transaction type (credit/debit), category
- Tap any transaction for full details and receipt

### Expenses Tracker
- Log daily expenses by category (food, transport, health, etc.)
- Set monthly budgets per category
- View spending breakdowns and charts
- Track how much of each budget you've used

### Services (Bill Payments)
Pay directly from your Kharcha wallet:
- Electricity (NEA)
- Water (KUKL and others)
- Internet (various ISPs)
- Education fees
- Landline bills
Steps: Click "Services" → choose provider → enter account/customer number → confirm payment

### QR Payments
- Tap the QR icon in the sidebar to scan a merchant QR code
- Payment is deducted from your wallet instantly
- Works at any Kharcha-enabled merchant

### Account & Security
- Update profile: name, photo, contact info
- KYC Verification: required for higher transaction limits and card access
- MPIN: 6-digit PIN for authorizing transfers (set under Account settings)
- Password reset: available via email OTP

## Financial Analysis Mode
When the user asks about their finances, analyze the provided data and:
1. Identify top spending categories
2. Compare current month vs last month trends
3. Predict next month's expenses using weighted averages (recent months weigh more)
4. Highlight categories where spending exceeds or is near budget limits
5. Give 2-3 specific, actionable saving tips based on their actual data
6. Recommend budget adjustments where needed

## Tone & Style
- Friendly, clear, and concise
- Use bullet points and numbered steps for how-to questions
- Use NPR for all currency amounts
- Be encouraging about saving goals
- If something is outside your scope, direct to the relevant app feature
- Keep responses focused — don't over-explain`;

exports.chatWithAI = async (req, res) => {
    const { messages, financialContext } = req.body;

    if (!GEMINI_API_KEY) {
        return res.status(503).json({
            success: false,
            message: "AI service is not configured. Please add GEMINI_API_KEY to your environment.",
        });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, message: "Messages array is required." });
    }

    try {
        // Build the system instruction (with optional financial context)
        let systemInstruction = SYSTEM_PROMPT;

        if (financialContext) {
            const ctx = financialContext;
            let contextBlock = "\n\n## User's Current Financial Snapshot (NPR)\n";

            if (ctx.walletBalance !== undefined) {
                contextBlock += `- Wallet Balance: NPR ${Number(ctx.walletBalance).toFixed(2)}\n`;
            }

            if (ctx.currentMonth) {
                const cm = ctx.currentMonth;
                contextBlock += `\n### This Month\n`;
                if (cm.totalIncome !== undefined) contextBlock += `- Total Income: NPR ${cm.totalIncome}\n`;
                if (cm.totalExpenses !== undefined) contextBlock += `- Total Expenses: NPR ${cm.totalExpenses}\n`;
                if (cm.categories?.length) {
                    contextBlock += `- Expense Breakdown:\n`;
                    cm.categories.forEach(c => {
                        contextBlock += `  * ${c.name}: NPR ${c.total}${c.budget ? ` (budget: NPR ${c.budget})` : ""}\n`;
                    });
                }
            }

            if (ctx.lastMonth) {
                const lm = ctx.lastMonth;
                contextBlock += `\n### Last Month\n`;
                if (lm.totalExpenses !== undefined) contextBlock += `- Total Expenses: NPR ${lm.totalExpenses}\n`;
                if (lm.categories?.length) {
                    contextBlock += `- Expense Breakdown:\n`;
                    lm.categories.forEach(c => {
                        contextBlock += `  * ${c.name}: NPR ${c.total}\n`;
                    });
                }
            }

            systemInstruction += contextBlock;
        }

        // Convert messages to Gemini format
        // Gemini uses role "user" and "model" (not "assistant")
        const geminiContents = messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));

        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemInstruction }],
                },
                contents: geminiContents,
                generationConfig: {
                    maxOutputTokens: 1024,
                    temperature: 0.7,
                },
            }),
        });

        const data = await response.json();

        // 429 = free-tier quota exhausted — fail gracefully, no charge
        if (response.status === 429) {
            return res.status(503).json({
                success: false,
                message: "The AI assistant has reached its daily limit. Please try again tomorrow.",
            });
        }

        if (!response.ok) {
            console.error("[AI] Gemini error:", data);
            throw new Error(data.error?.message || "AI request failed");
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        res.json({ success: true, message: text });
    } catch (err) {
        console.error("[AI] chatWithAI error:", err.message);
        res.status(500).json({
            success: false,
            message: "AI service is temporarily unavailable. Please try again shortly.",
        });
    }
};