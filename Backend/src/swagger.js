const swaggerUi = require("swagger-ui-express");

const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "E-Wallet API",
        version: "1.0.0",
        description:
            "Backend API for the E-Wallet application. Use the signup flow in order: **check → send-otp → verify-otp → complete**. Copy the `signup_token` from verify-otp into the complete step.",
    },
    servers: [
        {
            url: `http://localhost:${process.env.PORT || 5000}`,
            description: "Local development server",
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description:
                    "JWT token returned from /api/auth/signin or /api/auth/signup/complete",
            },
            ApiKeyAuth: {
                type: "apiKey",
                in: "header",
                name: "X-API-Key",
                description:
                    "Organisation API key for POS terminals. Format: `kh_live_<...>`. Created via POST /api/org/api-keys.",
            },
        },
        schemas: {
            SuccessResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string" },
                },
            },
            ErrorResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string" },
                    error: { type: "string" },
                },
            },
            AccountObject: {
                type: "object",
                properties: {
                    account_id: {
                        type: "string",
                        format: "uuid",
                        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    },
                    account_type: {
                        type: "string",
                        enum: ["user", "organization", "admin"],
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "john@example.com",
                    },
                },
            },
            SigninAccountObject: {
                type: "object",
                properties: {
                    account_id: {
                        type: "string",
                        format: "uuid",
                        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    },
                    account_type: {
                        type: "string",
                        enum: ["user", "organization", "admin"],
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "john@example.com",
                    },
                    mpin_set: {
                        type: "boolean",
                        description:
                            "Whether the user has configured their MPIN yet",
                        example: false,
                    },
                },
            },
            WalletObject: {
                type: "object",
                properties: {
                    wallet_id: { type: "string", format: "uuid" },
                    balance: { type: "number", example: 1500.0 },
                    currency: { type: "string", example: "NPR" },
                    is_active: { type: "boolean", example: true },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
            },
            ProfileResponse: {
                type: "object",
                properties: {
                    account_id: { type: "string", format: "uuid" },
                    account_type: {
                        type: "string",
                        enum: ["user", "organization", "admin"],
                    },
                    email: { type: "string", format: "email" },
                    phone_number: {
                        type: "string",
                        nullable: true,
                        example: "+9779800000000",
                    },
                    is_verified: { type: "boolean" },
                    is_active: { type: "boolean" },
                    created_at: { type: "string", format: "date-time" },
                    profile_picture_url: {
                        type: "string",
                        nullable: true,
                        description:
                            "Stored on the accounts table — shared across all account types",
                    },
                    full_name: {
                        type: "string",
                        nullable: true,
                        description: "Present for user and admin accounts",
                    },
                    organization_name: {
                        type: "string",
                        nullable: true,
                        description: "Present for organization accounts",
                    },
                    org_type_id: { type: "integer", nullable: true },
                    org_type_name: { type: "string", nullable: true },
                    wallet: {
                        $ref: "#/components/schemas/WalletObject",
                        nullable: true,
                    },
                },
            },
            GiftCardObject: {
                type: "object",
                properties: {
                    gift_card_id: { type: "string", format: "uuid" },
                    code: { type: "string", example: "KHRCH-A1B2-C3D4-E5F6" },
                    amount: { type: "number", example: 500 },
                    max_uses: { type: "integer", example: 1 },
                    times_used: { type: "integer", example: 0 },
                    is_active: { type: "boolean", example: true },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
            },
            CategoryObject: {
                type: "object",
                properties: {
                    category_id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Personal Use" },
                    icon: {
                        type: "string",
                        example: "user",
                        description: "Lucide icon name for the frontend",
                    },
                    sort_order: { type: "integer", example: 1 },
                },
            },
            OrgTypeObject: {
                type: "object",
                properties: {
                    org_type_id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Food & Restaurant" },
                    sort_order: { type: "integer", example: 5 },
                },
            },
            ReceiverObject: {
                type: "object",
                properties: {
                    account_id: { type: "string", format: "uuid" },
                    account_type: {
                        type: "string",
                        enum: ["user", "organization", "admin"],
                    },
                    display_name: { type: "string", example: "Jane Doe" },
                    phone_number: {
                        type: "string",
                        nullable: true,
                        example: "+9779811111111",
                    },
                    profile_picture: { type: "string", nullable: true },
                },
            },
            StatementItem: {
                type: "object",
                properties: {
                    transaction_id: { type: "string", format: "uuid" },
                    type: { type: "string", enum: ["sent", "received"] },
                    amount: { type: "number", example: 500.0 },
                    currency: { type: "string", example: "NPR" },
                    balance_after: { type: "number", example: 1000.0 },
                    counterparty: {
                        $ref: "#/components/schemas/ReceiverObject",
                    },
                    category: {
                        type: "string",
                        nullable: true,
                        example: "Personal Use",
                    },
                    category_icon: {
                        type: "string",
                        nullable: true,
                        example: "user",
                    },
                    remarks: { type: "string", nullable: true },
                    method: { type: "string", example: "Kharcha Wallet" },
                    status: { type: "string", example: "completed" },
                    created_at: { type: "string", format: "date-time" },
                },
            },
            PhysicalCardObject: {
                type: "object",
                properties: {
                    card_id: {
                        type: "string",
                        example: "A3B2C1D0",
                        description: "RFID UID (uppercase hex)",
                    },
                    status: {
                        type: "string",
                        enum: ["pending", "active", "blocked", "expired"],
                    },
                    daily_limit: {
                        type: "number",
                        example: 100000.0,
                        description: "Maximum NPR spendable per calendar day",
                    },
                    activated_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                    created_at: { type: "string", format: "date-time" },
                },
            },
            CardRequestObject: {
                type: "object",
                properties: {
                    request_id: { type: "string", format: "uuid" },
                    status: {
                        type: "string",
                        enum: ["pending", "approved", "rejected", "issued"],
                    },
                    delivery_address: { type: "string", nullable: true },
                    created_at: { type: "string", format: "date-time" },
                },
            },
            ApiKeyInfo: {
                type: "object",
                properties: {
                    api_key_id: { type: "string", format: "uuid" },
                    key_prefix: {
                        type: "string",
                        example: "kh_live_ab12",
                        description:
                            "First 12 chars of the key — for identification only",
                    },
                    name: { type: "string", example: "Main POS" },
                    is_active: { type: "boolean", example: true },
                    last_used_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                    created_at: { type: "string", format: "date-time" },
                    expires_at: {
                        type: "string",
                        format: "date-time",
                        nullable: true,
                    },
                },
            },
        },
    },
    tags: [
        { name: "Test", description: "Connection and health check routes" },
        { name: "Signup", description: "Multi-step account registration flow" },
        { name: "Auth", description: "Sign in and authentication" },
        {
            name: "MPIN",
            description: "Set up and change MPIN (requires auth token)",
        },
        {
            name: "Profile",
            description:
                "View and update profile, upload/remove profile picture",
        },
        {
            name: "Wallet",
            description: "Wallet balance, receiver lookup, and fund transfers",
        },
        {
            name: "Transactions",
            description:
                "Statement history, transaction detail, categories, and org types",
        },
        {
            name: "Cards",
            description:
                "Physical RFID card management — request, view, block, and update daily limit",
        },
        {
            name: "Admin — Cards",
            description:
                "Admin-only card operations: activate a card, list card requests",
        },
        {
            name: "API Keys",
            description:
                "Organisation API key management. Keys are used by all POS terminals of the org — no per-terminal registration needed.",
        },
        {
            name: "POS",
            description:
                "Point-of-sale tap-to-pay endpoint. Authenticated with X-API-Key header (no JWT). Hit by the terminal software when the RC522 scans a card.",
        },
        {
            name: "Gift Cards",
            description: "Generate gift card codes (admin only) and redeem them to top up a wallet balance. Supports multi-use cards with per-user redemption tracking.",
        },
        {
            name: "Khalti",
            description:
                "Load money into a Kharcha wallet via Khalti payment gateway. Two-step flow: initiate (returns a Khalti payment URL) → user pays → Khalti redirects to verify (credits the wallet).",
        },
        {
            name: "Password Reset",
            description:
                "Two-step flow to reset a forgotten password via email OTP. Step 1: send OTP → Step 2: verify OTP and set new password. No auth token required.",
        },
        {
            name: "MPIN Reset",
            description:
                "Two-step flow to reset a forgotten MPIN via email OTP. Step 1: send OTP → Step 2: verify OTP and set new MPIN. No auth token required.",
        },
        {
            name: "Verification",
            description:
                "KYC-style verification flow. Users submit their date of birth to request account verification. Unverified users cannot perform transactions.",
        },
        {
            name: "Admin — Verification",
            description:
                "Admin-only endpoints to list, view, and approve/reject user verification requests.",
        },
        {
            name: "Admin — Accounts",
            description:
                "Admin account management. Supports bootstrap mode (first admin ever, using a server-side code) and normal mode (logged-in admin creates another admin).",
        },
        {
            name: "Categories",
            description:
                "Expense category management. Returns system-wide default categories plus user-created custom categories. Users can create, update, and delete their own custom categories only.",
        },
        {
            name: "Expenses",
            description:
                "Expense tracking. Dashboard overview groups totals by category for a date range. Category detail view lists individual records with pagination. Full CRUD on individual expense entries.",
        },
        {
            name: "Income",
            description:
                "Income record management. List income entries within a date range (paginated, with aggregate total). Full CRUD on individual income records.",
        },
        {
            name: "Budgets",
            description:
                "Budget management. Each budget covers a time period and optionally a single category (NULL category_id = global budget). List response enriches every budget with actual spending, remaining amount, and utilisation percentage.",
        },
        {
            name: "Analytics",
            description:
                "Chart-ready analytics endpoints. All require start_date and end_date query params (max 92-day range). Returns pre-aggregated data for pie, bar, line, and income-vs-expense charts.",
        },
    ],
    paths: {
        "/": {
            get: {
                tags: ["Test"],
                summary: "Health check",
                description: "Redirects to /api/docs.",
                responses: {
                    302: { description: "Redirect to Swagger UI" },
                },
            },
        },
        "/api/test/db-test": {
            get: {
                tags: ["Test"],
                summary: "Database connection test",
                description:
                    "Queries the test table in Supabase to verify the database connection.",
                responses: {
                    200: {
                        description: "Database connected",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: {
                                            type: "string",
                                            example:
                                                "Database connected successfully",
                                        },
                                        data: {
                                            type: "array",
                                            items: { type: "object" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Database connection failed",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/signup/check": {
            post: {
                tags: ["Signup"],
                summary: "Step 1 — Check email and phone availability",
                description:
                    "Call this first. Verifies that the email (and optional phone number) are not already registered before starting the signup flow.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "account_type"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "john@example.com",
                                    },
                                    phone_number: {
                                        type: "string",
                                        example: "+9779800000000",
                                    },
                                    account_type: {
                                        type: "string",
                                        enum: ["user", "organization", "admin"],
                                        example: "user",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Email and phone are available",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing or invalid fields",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    409: {
                        description: "Email or phone already registered",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: false,
                                        },
                                        field: {
                                            type: "string",
                                            example: "email",
                                        },
                                        message: {
                                            type: "string",
                                            example:
                                                "An account with this email already exists.",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/signup/send-otp": {
            post: {
                tags: ["Signup"],
                summary: "Step 2 — Send OTP to email",
                description:
                    "Generates a 6-digit OTP and sends it to the provided email address. Valid for **15 minutes**. In development (no SMTP configured), the OTP is printed to the server console.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "john@example.com",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "OTP sent successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    400: {
                        description: "Email missing",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    500: {
                        description: "Failed to send OTP",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/signup/verify-otp": {
            post: {
                tags: ["Signup"],
                summary: "Step 3 — Verify OTP and receive signup_token",
                description:
                    "Validates the OTP entered by the user. On success, returns a short-lived `signup_token` (valid 15 minutes). You must pass this token to the /complete step — it proves email ownership.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "otp"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "john@example.com",
                                    },
                                    otp: { type: "string", example: "482913" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description:
                            "OTP verified — copy the signup_token for Step 4",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: {
                                            type: "string",
                                            example:
                                                "Email verified successfully.",
                                        },
                                        signup_token: {
                                            type: "string",
                                            example:
                                                "eyJhbGciOiJIUzI1NiIsInR5...",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Invalid or expired OTP",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/signup/complete": {
            post: {
                tags: ["Signup"],
                summary: "Step 4 — Complete signup",
                description:
                    "Creates the account. `full_name` is required for `user` and `admin` types. `organization_name` is required for `organization`. **MPIN is not set here** — the user configures it later from their profile/settings page.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: [
                                    "signup_token",
                                    "account_type",
                                    "password",
                                ],
                                properties: {
                                    signup_token: {
                                        type: "string",
                                        description:
                                            "Token received from the verify-otp step",
                                        example: "eyJhbGciOiJIUzI1NiIsInR5...",
                                    },
                                    account_type: {
                                        type: "string",
                                        enum: ["user", "organization", "admin"],
                                        example: "user",
                                    },
                                    password: {
                                        type: "string",
                                        format: "password",
                                        example: "SecurePass@123",
                                    },
                                    phone_number: {
                                        type: "string",
                                        example: "+9779800000000",
                                    },
                                    full_name: {
                                        type: "string",
                                        description:
                                            "Required for user and admin",
                                        example: "John Doe",
                                    },
                                    organization_name: {
                                        type: "string",
                                        description:
                                            "Required for organization",
                                        example: "Acme Corp",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "Account created — auth token returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: {
                                            type: "string",
                                            example:
                                                "Account created successfully.",
                                        },
                                        token: {
                                            type: "string",
                                            example:
                                                "eyJhbGciOiJIUzI1NiIsInR5...",
                                        },
                                        account: {
                                            $ref: "#/components/schemas/AccountObject",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Validation error or missing fields",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description:
                            "signup_token expired or invalid — user must start over",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    409: {
                        description: "Email or phone already exists",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/signin": {
            post: {
                tags: ["Auth"],
                summary: "Sign in",
                description:
                    "Single signin endpoint. `identifier` accepts **email or phone number**. `credential` accepts **password or 6-digit MPIN** — the backend auto-detects which is which.\n\n**Detection rules:**\n- `identifier`: contains `@` → treated as email, otherwise treated as phone number\n- `credential`: exactly 6 numeric digits → tried as MPIN first, then falls back to password if MPIN is not set up yet",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["identifier", "credential"],
                                properties: {
                                    identifier: {
                                        type: "string",
                                        description:
                                            "Email address or phone number",
                                        example: "john@example.com",
                                    },
                                    credential: {
                                        type: "string",
                                        description: "Password or 6-digit MPIN",
                                        example: "SecurePass@123",
                                    },
                                },
                            },
                            examples: {
                                "Email + password": {
                                    value: {
                                        identifier: "john@example.com",
                                        credential: "SecurePass@123",
                                    },
                                },
                                "Email + MPIN": {
                                    value: {
                                        identifier: "john@example.com",
                                        credential: "123456",
                                    },
                                },
                                "Phone + password": {
                                    value: {
                                        identifier: "+9779800000000",
                                        credential: "SecurePass@123",
                                    },
                                },
                                "Phone + MPIN": {
                                    value: {
                                        identifier: "+9779800000000",
                                        credential: "123456",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Signed in successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: {
                                            type: "string",
                                            example: "Signed in successfully.",
                                        },
                                        token: {
                                            type: "string",
                                            example:
                                                "eyJhbGciOiJIUzI1NiIsInR5...",
                                        },
                                        account: {
                                            $ref: "#/components/schemas/SigninAccountObject",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing identifier or credential",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description: "Invalid credentials",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description: "Account deactivated",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/mpin/setup": {
            post: {
                tags: ["MPIN"],
                summary: "Set up MPIN (first time)",
                description:
                    "Sets the MPIN for an account that does not have one yet. Requires the account **password** to confirm identity. Returns 409 if MPIN is already set — use `/mpin/change` in that case.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["password", "mpin"],
                                properties: {
                                    password: {
                                        type: "string",
                                        format: "password",
                                        description:
                                            "Current account password to verify identity",
                                        example: "SecurePass@123",
                                    },
                                    mpin: {
                                        type: "string",
                                        description: "Exactly 6 digits",
                                        example: "123456",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "MPIN set up successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing fields or invalid MPIN format",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description:
                            "No/invalid auth token — or incorrect password",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    409: {
                        description:
                            "MPIN already set — use /mpin/change instead",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/mpin/change": {
            post: {
                tags: ["MPIN"],
                summary: "Change existing MPIN",
                description:
                    "Changes an already-configured MPIN. Requires the **current MPIN** to authorize the update. Returns 403 if no MPIN has been set up yet — use `/mpin/setup` first.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["current_mpin", "new_mpin"],
                                properties: {
                                    current_mpin: {
                                        type: "string",
                                        description:
                                            "Your existing 6-digit MPIN",
                                        example: "123456",
                                    },
                                    new_mpin: {
                                        type: "string",
                                        description:
                                            "New 6-digit MPIN (must differ from current)",
                                        example: "654321",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "MPIN changed successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    400: {
                        description:
                            "Missing fields, invalid format, or new MPIN same as current",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description:
                            "No/invalid auth token — or incorrect current MPIN",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description:
                            "MPIN not yet set up — use /mpin/setup first",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── Profile ──────────────────────────────────────────────────────────

        "/api/profile": {
            get: {
                tags: ["Profile"],
                summary: "Get profile",
                description:
                    "Returns the authenticated account's full profile including type-specific fields (full_name for users/admins, organization_name for orgs), the shared `profile_picture_url` (stored on the accounts table), and current wallet balance.",
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: "Profile returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        profile: {
                                            $ref: "#/components/schemas/ProfileResponse",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
            patch: {
                tags: ["Profile"],
                summary: "Update profile",
                description:
                    "Updates editable profile fields. `phone_number` is updated on the accounts table (all types). `full_name` applies to user/admin accounts. `organization_name` and `org_type_id` apply to organization accounts. Send only the fields you want to change.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    phone_number: {
                                        type: "string",
                                        example: "+9779800000000",
                                    },
                                    full_name: {
                                        type: "string",
                                        example: "John Doe",
                                        description:
                                            "User / admin accounts only",
                                    },
                                    organization_name: {
                                        type: "string",
                                        example: "Acme Corp",
                                        description:
                                            "Organization accounts only",
                                    },
                                    org_type_id: {
                                        type: "integer",
                                        example: 5,
                                        description:
                                            "Organization accounts only — references organization_types",
                                    },
                                },
                            },
                            examples: {
                                "Update user name": {
                                    value: { full_name: "Jane Doe" },
                                },
                                "Update phone": {
                                    value: { phone_number: "+9779811111111" },
                                },
                                "Update org": {
                                    value: {
                                        organization_name: "New Corp",
                                        org_type_id: 5,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Profile updated",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    409: {
                        description: "Phone number already in use",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: false,
                                        },
                                        field: {
                                            type: "string",
                                            example: "phone_number",
                                        },
                                        message: {
                                            type: "string",
                                            example:
                                                "This phone number is already in use.",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/profile/picture": {
            post: {
                tags: ["Profile"],
                summary: "Upload profile picture",
                description:
                    "Uploads a new profile picture and stores it in Supabase Storage. The URL is saved to `accounts.profile_picture_url` (shared across all account types). Send the image as a base64-encoded string. Supports JPEG, PNG, WebP. Max 5 MB.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["file_base64", "mime_type"],
                                properties: {
                                    file_base64: {
                                        type: "string",
                                        description:
                                            "Base64-encoded image data (no data: prefix)",
                                        example: "/9j/4AAQSkZJRg...",
                                    },
                                    mime_type: {
                                        type: "string",
                                        enum: [
                                            "image/jpeg",
                                            "image/jpg",
                                            "image/png",
                                            "image/webp",
                                        ],
                                        example: "image/jpeg",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Profile picture uploaded",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: {
                                            type: "string",
                                            example:
                                                "Profile picture updated successfully.",
                                        },
                                        profile_picture_url: {
                                            type: "string",
                                            example:
                                                "https://xyz.supabase.co/storage/v1/object/public/profile-pictures/uuid/profile.jpg?v=1234567890",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description:
                            "Missing fields, invalid MIME type, or file too large (>5MB)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    500: {
                        description: "Upload failed",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ["Profile"],
                summary: "Delete profile picture",
                description:
                    "Removes the profile picture from Supabase Storage and clears `accounts.profile_picture_url`. Attempts removal for all supported extensions (jpg, png, webp).",
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: "Profile picture removed",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── Wallet ───────────────────────────────────────────────────────────

        "/api/wallet": {
            get: {
                tags: ["Wallet"],
                summary: "Get wallet",
                description:
                    "Returns the authenticated account's wallet details and current balance.",
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: "Wallet returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        wallet: {
                                            $ref: "#/components/schemas/WalletObject",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description: "Wallet is suspended",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "Wallet not found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/wallet/lookup": {
            get: {
                tags: ["Wallet"],
                summary: "Lookup receiver",
                description:
                    "Preview a receiver's info before confirming a transfer. Pass a phone number or account UUID as `identifier`. Returns 400 if the identifier belongs to the caller's own account.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "identifier",
                        in: "query",
                        required: true,
                        description: "Receiver's phone number or account UUID",
                        schema: { type: "string", example: "+9779811111111" },
                    },
                ],
                responses: {
                    200: {
                        description: "Receiver found",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        receiver: {
                                            $ref: "#/components/schemas/ReceiverObject",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing identifier or self-lookup",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "No account found for this identifier",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/wallet/transfer": {
            post: {
                tags: ["Wallet"],
                summary: "Transfer funds",
                description:
                    "Sends money from the caller's wallet to another account. `receiver_identifier` accepts a **phone number** or **account UUID**. The transfer is executed atomically in the database — balance is checked, both wallets are updated, and the transaction is recorded in a single PostgreSQL function call.\n\n**MPIN is required** — the caller must supply their 6-digit MPIN to authorise the transaction. The MPIN must be set up first via `/api/auth/mpin/setup`.\n\nUnverified user accounts cannot make transfers.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["receiver_identifier", "amount", "mpin"],
                                properties: {
                                    receiver_identifier: {
                                        type: "string",
                                        description:
                                            "Receiver phone number or account UUID",
                                        example: "+9779811111111",
                                    },
                                    amount: {
                                        type: "number",
                                        description:
                                            "Amount in NPR (minimum 1)",
                                        example: 500,
                                    },
                                    mpin: {
                                        type: "string",
                                        description:
                                            "Sender's 6-digit MPIN — required to authorise the transfer",
                                        example: "123456",
                                    },
                                    category_id: {
                                        type: "integer",
                                        nullable: true,
                                        description:
                                            "Optional — from GET /api/transactions/categories",
                                        example: 1,
                                    },
                                    remarks: {
                                        type: "string",
                                        nullable: true,
                                        description: "Optional note / memo",
                                        example: "Lunch split",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Transfer successful",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: {
                                            type: "string",
                                            example: "Transfer successful.",
                                        },
                                        transaction: {
                                            type: "object",
                                            properties: {
                                                transaction_id: {
                                                    type: "string",
                                                    format: "uuid",
                                                },
                                                amount: {
                                                    type: "number",
                                                    example: 500,
                                                },
                                                currency: {
                                                    type: "string",
                                                    example: "NPR",
                                                },
                                                balance_after: {
                                                    type: "number",
                                                    example: 1000,
                                                },
                                                receiver: {
                                                    $ref: "#/components/schemas/ReceiverObject",
                                                },
                                                remarks: {
                                                    type: "string",
                                                    nullable: true,
                                                },
                                                method: {
                                                    type: "string",
                                                    example: "Kharcha Wallet",
                                                },
                                                status: {
                                                    type: "string",
                                                    example: "completed",
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description:
                            "Validation error, missing MPIN, insufficient balance, inactive wallet, or self-transfer",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    "Missing MPIN": {
                                        value: { success: false, message: "mpin is required to authorise a transfer." },
                                    },
                                    "Insufficient balance": {
                                        value: { success: false, message: "Insufficient wallet balance." },
                                    },
                                    "Self-transfer": {
                                        value: { success: false, message: "You cannot transfer to your own wallet." },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing/invalid auth token, or incorrect MPIN",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    "Incorrect MPIN": {
                                        value: { success: false, message: "Incorrect MPIN." },
                                    },
                                    "No auth token": {
                                        value: { success: false, message: "Unauthorized." },
                                    },
                                },
                            },
                        },
                    },
                    403: {
                        description: "Account not verified, or MPIN not set up yet",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    "Not verified": {
                                        value: { success: false, message: "Your account is not yet verified. Please submit a verification request under /api/admin/verification/request and wait for admin approval before making transactions." },
                                    },
                                    "MPIN not set up": {
                                        value: { success: false, message: "You have not set up an MPIN yet. Please set one via /api/auth/mpin/setup before making transfers." },
                                    },
                                },
                            },
                        },
                    },
                    404: {
                        description: "Receiver not found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    429: {
                        description:
                            "Too many transfer requests — rate limited",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── Transactions ─────────────────────────────────────────────────────

        "/api/transactions/categories": {
            get: {
                tags: ["Transactions"],
                summary: "List transaction categories",
                description:
                    "Returns all active transaction categories. Use `category_id` when calling `/api/wallet/transfer`. Currently: **Personal Use** and **Food and Shopping** — more can be added directly in the database table.",
                responses: {
                    200: {
                        description: "Categories returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        categories: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/CategoryObject",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/transactions/org-types": {
            get: {
                tags: ["Profile"],
                summary: "List organization types",
                description:
                    "**Moved to `/api/profile/org-types`.** This path is no longer active.",
                deprecated: true,
                responses: {
                    410: {
                        description:
                            "Gone — use GET /api/profile/org-types instead",
                    },
                },
            },
        },

        "/api/profile/org-types": {
            get: {
                tags: ["Profile"],
                summary: "List organization types",
                description:
                    "Returns all active organization types. Use `org_type_id` when registering an organization or updating its profile via `PATCH /api/profile`.",
                responses: {
                    200: {
                        description: "Org types returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        org_types: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/OrgTypeObject",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/transactions": {
            get: {
                tags: ["Transactions"],
                summary: "Get statements (paginated)",
                description:
                    "Returns a paginated list of transactions for the authenticated account. Filter by direction (`type`), transaction category (`category_id`), and date range (`start_date` / `end_date`). Date range cannot exceed 3 months. Results are ordered by most recent first.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        schema: { type: "integer", default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", default: 20 },
                        description: "Items per page (max 50)",
                    },
                    {
                        name: "type",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: ["all", "sent", "received"],
                            default: "all",
                        },
                        description: "Filter by direction",
                    },
                    {
                        name: "category_id",
                        in: "query",
                        schema: { type: "integer" },
                        description:
                            "Filter by transaction category ID — get IDs from `GET /api/transactions/categories`",
                    },
                    {
                        name: "start_date",
                        in: "query",
                        schema: {
                            type: "string",
                            format: "date",
                            example: "2026-01-01",
                        },
                        description:
                            "Start of date range (inclusive). Format: YYYY-MM-DD. Required if `end_date` is provided.",
                    },
                    {
                        name: "end_date",
                        in: "query",
                        schema: {
                            type: "string",
                            format: "date",
                            example: "2026-03-31",
                        },
                        description:
                            "End of date range (inclusive, to 23:59:59). Format: YYYY-MM-DD. Must be within 3 months of `start_date`.",
                    },
                ],
                responses: {
                    200: {
                        description: "Statements returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        statements: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/StatementItem",
                                            },
                                        },
                                        pagination: {
                                            type: "object",
                                            properties: {
                                                page: { type: "integer" },
                                                limit: { type: "integer" },
                                                total: { type: "integer" },
                                                total_pages: {
                                                    type: "integer",
                                                },
                                                has_next: { type: "boolean" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    400: {
                        description:
                            "Invalid filter params — bad date format, end_date without start_date, or date range exceeds 3 months",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: false,
                                        },
                                        message: {
                                            type: "string",
                                            example:
                                                "Date range cannot exceed 3 months.",
                                        },
                                    },
                                },
                                examples: {
                                    "Bad date format": {
                                        value: {
                                            success: false,
                                            message:
                                                "Invalid date format. Use YYYY-MM-DD.",
                                        },
                                    },
                                    "start after end": {
                                        value: {
                                            success: false,
                                            message:
                                                "start_date must be before end_date.",
                                        },
                                    },
                                    "Range too wide": {
                                        value: {
                                            success: false,
                                            message:
                                                "Date range cannot exceed 3 months.",
                                        },
                                    },
                                    "end_date without start": {
                                        value: {
                                            success: false,
                                            message:
                                                "start_date is required when end_date is provided.",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/transactions/{transaction_id}": {
            get: {
                tags: ["Transactions"],
                summary: "Get transaction detail",
                description:
                    "Returns the full detail of a single transaction including both sender and receiver info. Only accessible if the authenticated account is the sender or receiver of that transaction.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "transaction_id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                        description: "Transaction UUID",
                    },
                ],
                responses: {
                    200: {
                        description: "Transaction detail returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        transaction: {
                                            type: "object",
                                            properties: {
                                                transaction_id: {
                                                    type: "string",
                                                    format: "uuid",
                                                },
                                                type: {
                                                    type: "string",
                                                    enum: ["sent", "received"],
                                                },
                                                amount: { type: "number" },
                                                currency: {
                                                    type: "string",
                                                    example: "NPR",
                                                },
                                                balance_after: {
                                                    type: "number",
                                                },
                                                sender: {
                                                    $ref: "#/components/schemas/ReceiverObject",
                                                },
                                                receiver: {
                                                    $ref: "#/components/schemas/ReceiverObject",
                                                },
                                                category: {
                                                    type: "object",
                                                    properties: {
                                                        category_id: {
                                                            type: "integer",
                                                            nullable: true,
                                                        },
                                                        name: {
                                                            type: "string",
                                                            nullable: true,
                                                        },
                                                        icon: {
                                                            type: "string",
                                                            nullable: true,
                                                        },
                                                    },
                                                },
                                                remarks: {
                                                    type: "string",
                                                    nullable: true,
                                                },
                                                method: {
                                                    type: "string",
                                                    example: "Kharcha Wallet",
                                                },
                                                status: {
                                                    type: "string",
                                                    example: "completed",
                                                },
                                                created_at: {
                                                    type: "string",
                                                    format: "date-time",
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description: "You are not part of this transaction",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "Transaction not found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── Cards ─────────────────────────────────────────────────────────

        "/api/cards/request": {
            post: {
                tags: ["Cards"],
                summary: "Request a physical card",
                description:
                    "Submits a card request for the authenticated user. Admin will approve it, program the RC522 RFID card, and activate it. Only `user` accounts can request a card. Returns 409 if a request is already pending or an active card exists.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    delivery_address: {
                                        type: "string",
                                        nullable: true,
                                        example: "Baneshwor, Kathmandu",
                                        description:
                                            "Optional delivery address for the card",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "Card request submitted",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: { type: "string" },
                                        request: {
                                            $ref: "#/components/schemas/CardRequestObject",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    403: {
                        description: "Only user accounts can request a card",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    409: {
                        description:
                            "A pending request or active card already exists",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/cards/my-card": {
            get: {
                tags: ["Cards"],
                summary: "Get my card",
                description:
                    "Returns the authenticated user's physical card details (if issued), or their pending card request if no card exists yet.",
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: "Card or pending request returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        card: {
                                            nullable: true,
                                            allOf: [
                                                {
                                                    $ref: "#/components/schemas/PhysicalCardObject",
                                                },
                                            ],
                                        },
                                        pending_request: {
                                            nullable: true,
                                            allOf: [
                                                {
                                                    $ref: "#/components/schemas/CardRequestObject",
                                                },
                                            ],
                                            description:
                                                "Populated only when card is null",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/cards/my-card/block": {
            post: {
                tags: ["Cards"],
                summary: "Block my card",
                description:
                    "Immediately blocks the user's active card. Once blocked, the card will be refused at all POS terminals. Contact support to unblock it.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    reason: {
                                        type: "string",
                                        nullable: true,
                                        example: "Lost card",
                                        description:
                                            "Optional reason for blocking",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Card blocked successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "No active card found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/cards/my-card/limits": {
            patch: {
                tags: ["Cards"],
                summary: "Update daily spend limit",
                description:
                    "Sets a new daily spending limit on the user's active card. The limit caps how much can be spent in a single calendar day across all POS transactions. Range: NPR 100 – 100,000. Default is 100,000.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["daily_limit"],
                                properties: {
                                    daily_limit: {
                                        type: "number",
                                        example: 50000,
                                        description:
                                            "New daily limit in NPR (100 – 100,000)",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Daily limit updated",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: { type: "string" },
                                        updates: {
                                            type: "object",
                                            properties: {
                                                daily_limit: {
                                                    type: "number",
                                                    example: 50000,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing or out-of-range value",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "No active card found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── Admin — Cards ─────────────────────────────────────────────────

        "/api/cards/admin/activate": {
            post: {
                tags: ["Admin — Cards"],
                summary: "Activate a card (admin)",
                description:
                    "Admin-only. After physically programming an RC522 RFID card with a UID, call this endpoint to link that UID to a user account and set the card as active. `request_id` is optional — supply it to mark the card request as issued.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["card_id", "account_id"],
                                properties: {
                                    card_id: {
                                        type: "string",
                                        example: "A3B2C1D0",
                                        description:
                                            "RFID UID read from the physical card (uppercase hex)",
                                    },
                                    account_id: {
                                        type: "string",
                                        format: "uuid",
                                        description:
                                            "UUID of the user account to link the card to",
                                    },
                                    request_id: {
                                        type: "string",
                                        format: "uuid",
                                        nullable: true,
                                        description:
                                            "Optional — marks the card_request row as 'issued'",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "Card activated",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: { type: "string" },
                                        card: {
                                            $ref: "#/components/schemas/PhysicalCardObject",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing required fields",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description: "Admin access required",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "User account not found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    409: {
                        description: "Card ID already registered",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/cards/admin/requests": {
            get: {
                tags: ["Admin — Cards"],
                summary: "List card requests (admin)",
                description:
                    "Returns all card requests across all users. Optionally filter by `status`. Ordered by most recent first.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        schema: {
                            type: "string",
                            enum: ["pending", "approved", "rejected", "issued"],
                        },
                        description: "Filter by request status",
                    },
                ],
                responses: {
                    200: {
                        description: "Card requests returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        requests: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    request_id: {
                                                        type: "string",
                                                        format: "uuid",
                                                    },
                                                    account_id: {
                                                        type: "string",
                                                        format: "uuid",
                                                    },
                                                    status: { type: "string" },
                                                    delivery_address: {
                                                        type: "string",
                                                        nullable: true,
                                                    },
                                                    admin_notes: {
                                                        type: "string",
                                                        nullable: true,
                                                    },
                                                    created_at: {
                                                        type: "string",
                                                        format: "date-time",
                                                    },
                                                    updated_at: {
                                                        type: "string",
                                                        format: "date-time",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    403: {
                        description: "Admin access required",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── API Keys ──────────────────────────────────────────────────────

        "/api/org/api-keys": {
            post: {
                tags: ["API Keys"],
                summary: "Create API key",
                description:
                    "Generates a new API key for the organisation. The raw key is returned **once only** — it is never stored in plain text. Copy it immediately and distribute it to all POS terminals. All terminals for the same org share this key. Maximum 10 active keys per org.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string",
                                        example: "Main POS",
                                        description:
                                            "Human-readable label for this key",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "API key created — copy it now",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: { type: "string" },
                                        api_key: {
                                            type: "string",
                                            example: "kh_live_a1b2c3d4e5f6...",
                                            description:
                                                "Full raw key — shown ONCE, never again",
                                        },
                                        key_info: {
                                            $ref: "#/components/schemas/ApiKeyInfo",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "10-key limit reached",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description: "Organization accounts only",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
            get: {
                tags: ["API Keys"],
                summary: "List API keys",
                description:
                    "Returns all API keys belonging to the authenticated organisation. The raw key is never returned — only the prefix, name, and metadata.",
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: "API keys returned",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        api_keys: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/ApiKeyInfo",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    403: {
                        description: "Organization accounts only",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/org/api-keys/{api_key_id}": {
            delete: {
                tags: ["API Keys"],
                summary: "Revoke API key",
                description:
                    "Deactivates an API key. Any POS terminal still using it will immediately receive 401 errors. This cannot be undone — create a new key if needed.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "api_key_id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                        description: "UUID of the API key to revoke",
                    },
                ],
                responses: {
                    200: {
                        description: "API key revoked",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/SuccessResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "API key not found",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description: "Organization accounts only",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── POS ───────────────────────────────────────────────────────────

        "/api/pos/charge": {
            post: {
                tags: ["POS"],
                summary: "Charge a card (tap-to-pay)",
                description:
                    "Core POS endpoint. Called by terminal software when the RC522 reads an RFID card. **No JWT required** — authenticated via `X-API-Key` header.\n\n**Flow:**\n1. Cashier enters amount on the POS screen\n2. Customer taps RFID card on the RC522 reader\n3. Arduino/laptop sends the card UID + amount to this endpoint\n4. Kharcha atomically checks the daily limit, debits the cardholder's wallet, and credits the merchant's wallet\n\nAll terminals of the same organisation share a single API key.",
                security: [{ ApiKeyAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["card_id", "amount"],
                                properties: {
                                    card_id: {
                                        type: "string",
                                        example: "A3B2C1D0",
                                        description:
                                            "RFID UID from the RC522 (uppercase hex, 4 or 7 bytes)",
                                    },
                                    amount: {
                                        type: "number",
                                        example: 450.0,
                                        description:
                                            "Amount in NPR (minimum 1)",
                                    },
                                    remarks: {
                                        type: "string",
                                        nullable: true,
                                        example: "Purchase #1042",
                                        description:
                                            "Optional receipt reference or note",
                                    },
                                },
                            },
                            examples: {
                                "Basic charge": {
                                    value: {
                                        card_id: "A3B2C1D0",
                                        amount: 450.0,
                                    },
                                },
                                "Charge with remarks": {
                                    value: {
                                        card_id: "A3B2C1D0",
                                        amount: 1250.0,
                                        remarks: "Groceries - Receipt #4201",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Payment successful",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: {
                                            type: "boolean",
                                            example: true,
                                        },
                                        message: {
                                            type: "string",
                                            example: "Payment successful.",
                                        },
                                        transaction: {
                                            type: "object",
                                            properties: {
                                                transaction_id: {
                                                    type: "string",
                                                    format: "uuid",
                                                },
                                                amount: {
                                                    type: "number",
                                                    example: 450.0,
                                                },
                                                currency: {
                                                    type: "string",
                                                    example: "NPR",
                                                },
                                                balance_after: {
                                                    type: "number",
                                                    example: 9550.0,
                                                    description:
                                                        "Cardholder's wallet balance after deduction",
                                                },
                                                merchant: {
                                                    type: "object",
                                                    properties: {
                                                        account_id: {
                                                            type: "string",
                                                            format: "uuid",
                                                        },
                                                        display_name: {
                                                            type: "string",
                                                            example:
                                                                "Bhatbhateni Superstore",
                                                        },
                                                    },
                                                },
                                                remarks: {
                                                    type: "string",
                                                    nullable: true,
                                                },
                                                method: {
                                                    type: "string",
                                                    example: "pos_rfid",
                                                },
                                                status: {
                                                    type: "string",
                                                    example: "completed",
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description:
                            "Validation error, insufficient balance, or daily limit reached",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    "Insufficient balance": {
                                        value: {
                                            success: false,
                                            message:
                                                "Insufficient wallet balance.",
                                        },
                                    },
                                    "Daily limit reached": {
                                        value: {
                                            success: false,
                                            message:
                                                "Card daily spending limit reached.",
                                        },
                                    },
                                    "Self-charge": {
                                        value: {
                                            success: false,
                                            message:
                                                "Cannot charge your own account.",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid API key",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    403: {
                        description:
                            "Card is not active (blocked, pending, or expired)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "Card not registered in the system",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    429: {
                        description: "Rate limit exceeded (30 req/min per IP)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // ── Khalti ───────────────────────────────────────────────────────────

        "/api/khalti/initiate": {
            post: {
                tags: ["Khalti"],
                summary: "Initiate a Khalti top-up",
                description:
                    "Creates a Khalti payment session for the authenticated user. Returns a `payment_url` — redirect the user there to complete the payment on Khalti's page. After the user pays, Khalti redirects them to `GET /api/khalti/verify` which credits their wallet automatically.\n\n**Min:** NPR 10 &nbsp; **Max:** NPR 1,00,000",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["amount"],
                                properties: {
                                    amount: {
                                        type: "number",
                                        description: "Amount in NPR to load (min 10, max 100000)",
                                        example: 500,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Payment session created — redirect user to payment_url",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Payment initiated. Redirect the user to payment_url." },
                                        pidx: {
                                            type: "string",
                                            description: "Khalti payment token — store this if you want to track the session",
                                            example: "HT6o2sQfNxuAFJHJmDPNnR",
                                        },
                                        payment_url: {
                                            type: "string",
                                            description: "Redirect the user to this URL to complete payment on Khalti",
                                            example: "https://dev.khalti.com/payment/HT6o2sQfNxuAFJHJmDPNnR/",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing or invalid amount",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    "Amount too low": {
                                        value: { success: false, message: "Minimum load amount is NPR 10." },
                                    },
                                    "Amount too high": {
                                        value: { success: false, message: "Maximum load amount is NPR 1,00,000." },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    500: {
                        description: "Khalti API error or server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        // ── Password Reset ────────────────────────────────────────────────────

        "/api/auth/password/forgot-send-otp": {
            post: {
                tags: ["Password Reset"],
                summary: "Step 1 — Send password reset OTP",
                description:
                    "Sends a one-time password to the given email address if an account exists for it. Always returns 200 (to prevent email enumeration). The OTP is valid for 10 minutes. Any previously issued unused OTPs for that email are invalidated.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "john@example.com",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "OTP sent (or silently skipped if email not found)",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SuccessResponse" },
                                example: {
                                    success: true,
                                    message: "If an account exists for john@example.com, a reset code has been sent. Valid for 10 minutes.",
                                },
                            },
                        },
                    },
                    400: {
                        description: "Email missing",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/password/reset": {
            post: {
                tags: ["Password Reset"],
                summary: "Step 2 — Verify OTP and set new password",
                description:
                    "Verifies the OTP sent to the email and sets the new password. The OTP is marked as used on success and cannot be reused. Requires the new password to be at least 8 characters.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "otp", "new_password"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "john@example.com",
                                    },
                                    otp: {
                                        type: "string",
                                        description: "6-digit OTP received by email",
                                        example: "482910",
                                    },
                                    new_password: {
                                        type: "string",
                                        description: "New password (minimum 8 characters)",
                                        example: "MyNewP@ss1",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Password reset successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SuccessResponse" },
                                example: {
                                    success: true,
                                    message: "Password reset successfully. Please sign in with your new password.",
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing fields, invalid OTP, expired OTP, or password too short",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    "Invalid OTP": {
                                        value: { success: false, message: "Invalid or expired reset code." },
                                    },
                                    "Password too short": {
                                        value: { success: false, message: "Password must be at least 8 characters." },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        // ── MPIN Reset ────────────────────────────────────────────────────────

        "/api/auth/mpin/forgot-send-otp": {
            post: {
                tags: ["MPIN Reset"],
                summary: "Step 1 — Send MPIN reset OTP",
                description:
                    "Sends an OTP to the given email address to allow the user to reset their MPIN. Always returns 200 to prevent email enumeration. Any previously issued unused MPIN-reset OTPs for that email are invalidated.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "john@example.com",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "OTP sent (or silently skipped if email not found)",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SuccessResponse" },
                                example: {
                                    success: true,
                                    message: "If an account exists for john@example.com, an MPIN reset code has been sent. Valid for 10 minutes.",
                                },
                            },
                        },
                    },
                    400: {
                        description: "Email missing",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        "/api/auth/mpin/reset": {
            post: {
                tags: ["MPIN Reset"],
                summary: "Step 2 — Verify OTP and set new MPIN",
                description:
                    "Verifies the OTP and sets the new 6-digit MPIN. The OTP is marked as used on success. No auth token is required — this is the recovery path for users who forgot their MPIN.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "otp", "new_mpin"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "john@example.com",
                                    },
                                    otp: {
                                        type: "string",
                                        description: "6-digit OTP received by email",
                                        example: "738291",
                                    },
                                    new_mpin: {
                                        type: "string",
                                        description: "New 6-digit numeric MPIN",
                                        example: "654321",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "MPIN reset successfully",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SuccessResponse" },
                                example: { success: true, message: "MPIN reset successfully." },
                            },
                        },
                    },
                    400: {
                        description: "Missing fields, invalid OTP, expired OTP, or MPIN not 6 digits",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    "Invalid OTP": {
                                        value: { success: false, message: "Invalid or expired reset code." },
                                    },
                                    "Bad MPIN format": {
                                        value: { success: false, message: "MPIN must be exactly 6 digits." },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        // ── Verification (user submits) ───────────────────────────────────────

        "/api/admin/verification/request": {
            post: {
                tags: ["Verification"],
                summary: "Submit verification request (user)",
                description:
                    "Allows a logged-in **user** account to submit a KYC verification request by providing their date of birth. The DOB is also saved to the user's profile.\n\n**Rules:**\n- Only `user` account types can call this\n- Must be at least 16 years old\n- Only one pending request can exist at a time (409 if a pending request already exists)\n- Unverified users cannot perform wallet transactions",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["dob"],
                                properties: {
                                    dob: {
                                        type: "string",
                                        format: "date",
                                        description: "Date of birth in YYYY-MM-DD format",
                                        example: "1995-08-20",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "Verification request submitted",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Verification request submitted. An admin will review it shortly." },
                                        request: {
                                            type: "object",
                                            properties: {
                                                request_id: { type: "string", format: "uuid" },
                                                status: { type: "string", example: "pending" },
                                                created_at: { type: "string", format: "date-time" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing or invalid DOB, or user is under 16",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    "Missing DOB": {
                                        value: { success: false, message: "dob (date of birth) is required." },
                                    },
                                    "Bad format": {
                                        value: { success: false, message: "dob must be in YYYY-MM-DD format." },
                                    },
                                    "Under 16": {
                                        value: { success: false, message: "You must be at least 16 years old." },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    403: {
                        description: "Account type is not 'user'",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: { success: false, message: "Only user accounts can submit verification requests." },
                            },
                        },
                    },
                    409: {
                        description: "A pending verification request already exists",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: { success: false, message: "You already have a pending verification request. Please wait for it to be reviewed." },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        // ── Admin — Verification ──────────────────────────────────────────────

        "/api/admin/verification/requests": {
            get: {
                tags: ["Admin — Verification"],
                summary: "List verification requests (admin)",
                description:
                    "Returns a paginated list of verification requests filtered by status. Each item includes enriched user details (name, email, phone, profile picture). Oldest pending requests appear first; reviewed requests are newest-first.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        description: "Filter by request status (default: pending)",
                        schema: {
                            type: "string",
                            enum: ["pending", "approved", "rejected"],
                            default: "pending",
                        },
                    },
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        description: "Results per page (max 50)",
                        schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
                    },
                ],
                responses: {
                    200: {
                        description: "List of verification requests",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    request_id: { type: "string", format: "uuid" },
                                                    account_id: { type: "string", format: "uuid" },
                                                    dob: { type: "string", format: "date", example: "1995-08-20" },
                                                    status: { type: "string", enum: ["pending", "approved", "rejected"] },
                                                    admin_notes: { type: "string", nullable: true },
                                                    reviewed_by: { type: "string", format: "uuid", nullable: true },
                                                    created_at: { type: "string", format: "date-time" },
                                                    updated_at: { type: "string", format: "date-time" },
                                                    user: {
                                                        type: "object",
                                                        properties: {
                                                            full_name: { type: "string", nullable: true },
                                                            email: { type: "string", format: "email", nullable: true },
                                                            phone_number: { type: "string", nullable: true },
                                                            profile_picture_url: { type: "string", nullable: true },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        pagination: {
                                            type: "object",
                                            properties: {
                                                page: { type: "integer" },
                                                limit: { type: "integer" },
                                                total: { type: "integer" },
                                                total_pages: { type: "integer" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Invalid status value",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    403: {
                        description: "Caller is not an admin",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        "/api/admin/verification/requests/{request_id}": {
            get: {
                tags: ["Admin — Verification"],
                summary: "Get single verification request (admin)",
                description:
                    "Returns full details of a single verification request including enriched user information: full name, DOB on profile, email, phone, wallet balance, transaction count, and account age. Useful for making an informed approve/reject decision.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "request_id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                        description: "UUID of the verification request",
                    },
                ],
                responses: {
                    200: {
                        description: "Full verification request details",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "object",
                                            properties: {
                                                request_id: { type: "string", format: "uuid" },
                                                account_id: { type: "string", format: "uuid" },
                                                dob: { type: "string", format: "date", example: "1995-08-20" },
                                                status: { type: "string", enum: ["pending", "approved", "rejected"] },
                                                admin_notes: { type: "string", nullable: true },
                                                reviewed_by: { type: "string", format: "uuid", nullable: true },
                                                created_at: { type: "string", format: "date-time" },
                                                updated_at: { type: "string", format: "date-time" },
                                                user: {
                                                    type: "object",
                                                    properties: {
                                                        full_name: { type: "string", nullable: true },
                                                        dob_on_profile: { type: "string", format: "date", nullable: true },
                                                        email: { type: "string", format: "email", nullable: true },
                                                        phone_number: { type: "string", nullable: true },
                                                        profile_picture_url: { type: "string", nullable: true },
                                                        account_created_at: { type: "string", format: "date-time", nullable: true },
                                                        transaction_count: { type: "integer", example: 12 },
                                                        wallet_balance: { type: "number", example: 3500.0 },
                                                        wallet_currency: { type: "string", example: "NPR" },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    403: {
                        description: "Caller is not an admin",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    404: {
                        description: "Verification request not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: { success: false, message: "Verification request not found." },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        "/api/admin/verification/requests/{request_id}/review": {
            post: {
                tags: ["Admin — Verification"],
                summary: "Approve or reject a verification request (admin)",
                description:
                    "Reviews a pending verification request.\n\n- **approve** → sets `accounts.is_verified = true`, allowing the user to make transactions\n- **reject** → leaves `is_verified = false`; the user can resubmit a new request\n\nCannot review a request that has already been approved or rejected (409).",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "request_id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                        description: "UUID of the verification request to review",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["action"],
                                properties: {
                                    action: {
                                        type: "string",
                                        enum: ["approve", "reject"],
                                        description: "Decision on the verification request",
                                        example: "approve",
                                    },
                                    admin_notes: {
                                        type: "string",
                                        description: "Optional notes from the reviewing admin (stored on the request)",
                                        example: "DOB verified against provided info.",
                                        nullable: true,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Request reviewed successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Verification request approved." },
                                        data: {
                                            type: "object",
                                            properties: {
                                                request_id: { type: "string", format: "uuid" },
                                                status: { type: "string", enum: ["approved", "rejected"] },
                                                reviewed_by: { type: "string", format: "uuid" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing or invalid action",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: { success: false, message: "action must be \"approve\" or \"reject\"." },
                            },
                        },
                    },
                    401: {
                        description: "Missing or invalid auth token",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    403: {
                        description: "Caller is not an admin",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    404: {
                        description: "Verification request not found",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    409: {
                        description: "Request already reviewed",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: { success: false, message: "This request has already been approved." },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        // ── Admin — Accounts ──────────────────────────────────────────────────

        "/api/admin/create": {
            post: {
                tags: ["Admin — Accounts"],
                summary: "Create an admin account",
                description:
                    "Creates a new admin account. Supports two modes:\n\n**Bootstrap mode** (no admins exist yet): Pass `bootstrap_code` matching the `ADMIN_BOOTSTRAP_CODE` env variable. Auth token is optional.\n\n**Normal mode** (admins already exist): Must be called by an authenticated admin. `bootstrap_code` is ignored.\n\nThe new admin account is automatically verified and gets a wallet.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password", "full_name"],
                                properties: {
                                    email: {
                                        type: "string",
                                        format: "email",
                                        example: "admin@example.com",
                                    },
                                    password: {
                                        type: "string",
                                        description: "Minimum 8 characters",
                                        example: "SecurePass1!",
                                    },
                                    full_name: {
                                        type: "string",
                                        example: "Ramesh Shrestha",
                                    },
                                    bootstrap_code: {
                                        type: "string",
                                        description: "Required only when no admins exist yet (bootstrap mode). Must match ADMIN_BOOTSTRAP_CODE on the server.",
                                        example: "SUPER_SECRET_CODE",
                                        nullable: true,
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "Admin account created",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Admin account created successfully." },
                                        admin: {
                                            type: "object",
                                            properties: {
                                                account_id: { type: "string", format: "uuid" },
                                                email: { type: "string", format: "email" },
                                                full_name: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Missing required fields or password too short",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    "Missing fields": {
                                        value: { success: false, message: "email, password, and full_name are required." },
                                    },
                                    "Short password": {
                                        value: { success: false, message: "Password must be at least 8 characters." },
                                    },
                                },
                            },
                        },
                    },
                    403: {
                        description: "Not an admin (when admins exist) or invalid/missing bootstrap code",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                examples: {
                                    "Admins exist, not logged in as admin": {
                                        value: { success: false, message: "Admin accounts already exist. You must be logged in as an admin to create another." },
                                    },
                                    "Invalid bootstrap code": {
                                        value: { success: false, message: "Invalid bootstrap code." },
                                    },
                                    "Bootstrap code not configured": {
                                        value: { success: false, message: "No ADMIN_BOOTSTRAP_CODE is configured on this server. Set it in your .env file." },
                                    },
                                },
                            },
                        },
                    },
                    409: {
                        description: "Email already registered",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                                example: { success: false, message: "An account with this email already exists." },
                            },
                        },
                    },
                    500: {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },
        },

        "/api/khalti/verify": {
            get: {
                tags: ["Khalti"],
                summary: "Verify payment and credit wallet (Khalti callback)",
                description:
                    "This endpoint is called automatically by Khalti as a redirect after the user completes (or cancels) payment. You do **not** call this manually — Khalti appends `?pidx=...&status=...` to the `return_url` you configured.\n\nIf the payment is `Completed`, this endpoint:\n1. Confirms the payment with Khalti's lookup API\n2. Credits the user's Kharcha wallet\n3. Records a transaction with method `Khalti`\n4. Marks the payment as `success`\n\nIdempotent — calling it twice with the same `pidx` is safe.",
                parameters: [
                    {
                        name: "pidx",
                        in: "query",
                        required: true,
                        description: "Khalti payment token (appended automatically by Khalti)",
                        schema: { type: "string", example: "HT6o2sQfNxuAFJHJmDPNnR" },
                    },
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        description: "Payment status sent by Khalti (e.g. Completed, Pending, User canceled)",
                        schema: { type: "string", example: "Completed" },
                    },
                    {
                        name: "transaction_id",
                        in: "query",
                        required: false,
                        description: "Khalti's own transaction reference (informational)",
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: {
                        description: "Wallet credited successfully (or already processed)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "NPR 500 loaded into your Kharcha wallet." },
                                        transaction_id: { type: "string", format: "uuid" },
                                        amount: { type: "number", example: 500 },
                                        balance_after: { type: "number", example: 1500 },
                                        pidx: { type: "string", example: "HT6o2sQfNxuAFJHJmDPNnR" },
                                    },
                                },
                                examples: {
                                    "Success": {
                                        value: {
                                            success: true,
                                            message: "NPR 500 loaded into your Kharcha wallet.",
                                            transaction_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                            amount: 500,
                                            balance_after: 1500,
                                            pidx: "HT6o2sQfNxuAFJHJmDPNnR",
                                        },
                                    },
                                    "Already processed": {
                                        value: {
                                            success: true,
                                            message: "Payment was already processed.",
                                            pidx: "HT6o2sQfNxuAFJHJmDPNnR",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "pidx missing",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                    500: {
                        description: "Payment not completed by user, or Khalti/server error",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ErrorResponse" },
                            },
                        },
                    },
                },
            },

        },
        // ── Gift Cards ────────────────────────────────────────────
        "/api/gift-cards/generate": {
            post: {
                tags: ["Gift Cards"],
                summary: "Generate gift cards (Admin only)",
                description:
                    "Bulk-generate gift cards with specified amounts and quantities.\n\n" +
                    "The request body is a map of `amount → numberOfCards`, plus an optional `max_uses` field.\n\n" +
                    "**Example:** `{ \"500\": 3, \"1000\": 2, \"max_uses\": 5 }` — generates 3 cards worth NPR 500 and 2 cards worth NPR 1000, each redeemable 5 times by different users.\n\n" +
                    "Each code is formatted as `KHRCH-XXXX-XXXX-XXXX`.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    max_uses: {
                                        type: "integer",
                                        default: 1,
                                        minimum: 1,
                                        description: "How many different users may redeem each card. Default: 1.",
                                        example: 1,
                                    },
                                },
                                additionalProperties: {
                                    type: "integer",
                                    description: "Key = amount in NPR, Value = number of cards to generate",
                                },
                                example: { "500": 3, "1000": 2, max_uses: 1 },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "Gift cards generated successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Successfully generated 5 gift card(s)." },
                                        max_uses: { type: "integer", example: 1 },
                                        total_generated: { type: "integer", example: 5 },
                                        cards: {
                                            type: "object",
                                            description: "Cards grouped by amount",
                                            additionalProperties: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        gift_card_id: { type: "string", format: "uuid" },
                                                        code: { type: "string", example: "KHRCH-A1B2-C3D4-E5F6" },
                                                        created_at: { type: "string", format: "date-time" },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    403: { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/gift-cards/redeem": {
            post: {
                tags: ["Gift Cards"],
                summary: "Redeem a gift card",
                description:
                    "Redeem a gift card code to credit its value into the authenticated user's wallet.\n\n" +
                    "- A user can only redeem the same card **once**.\n" +
                    "- Multiple users can redeem the same card up to its `max_uses` limit.\n" +
                    "- Funds are transferred from the platform system account.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["code"],
                                properties: {
                                    code: {
                                        type: "string",
                                        example: "KHRCH-A1B2-C3D4-E5F6",
                                        description: "The gift card code (case-insensitive)",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Gift card redeemed successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Gift card redeemed! NPR 500 has been added to your wallet." },
                                        redemption: {
                                            type: "object",
                                            properties: {
                                                amount_credited: { type: "number", example: 500 },
                                                currency: { type: "string", example: "NPR" },
                                                new_balance: { type: "number", example: 1500 },
                                                transaction_id: { type: "string", format: "uuid" },
                                                uses_remaining: { type: "integer", example: 0 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Card inactive or fully redeemed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Invalid gift card code", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    409: { description: "User has already redeemed this card", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/gift-cards": {
            get: {
                tags: ["Gift Cards"],
                summary: "List all gift cards (Admin only)",
                description: "Returns a paginated list of all gift cards. Filterable by active status.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "is_active", in: "query", schema: { type: "boolean" }, description: "Filter by active status" },
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
                ],
                responses: {
                    200: {
                        description: "List of gift cards",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/GiftCardObject" } },
                                        pagination: {
                                            type: "object",
                                            properties: {
                                                page: { type: "integer" },
                                                limit: { type: "integer" },
                                                total: { type: "integer" },
                                                total_pages: { type: "integer" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    403: { description: "Not an admin", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/gift-cards/{gift_card_id}/deactivate": {
            patch: {
                tags: ["Gift Cards"],
                summary: "Deactivate a gift card (Admin only)",
                description: "Permanently deactivates a gift card so it can no longer be redeemed.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    {
                        name: "gift_card_id",
                        in: "path",
                        required: true,
                        schema: { type: "string", format: "uuid" },
                        description: "UUID of the gift card to deactivate",
                    },
                ],
                responses: {
                    200: { description: "Gift card deactivated", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
                    404: { description: "Gift card not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    409: { description: "Gift card already inactive", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        // ── Categories ──────────────────────────────────────────────────────
        "/api/categories": {
            get: {
                tags: ["Categories"],
                summary: "List all categories",
                description:
                    "Returns all system-wide default categories (user_id = null) **plus** the authenticated user's custom categories, ordered defaults-first then alphabetically.",
                security: [{ BearerAuth: [] }],
                responses: {
                    200: {
                        description: "Categories retrieved",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    category_id: { type: "string", format: "uuid" },
                                                    user_id: { type: "string", format: "uuid", nullable: true, description: "null for system defaults" },
                                                    name: { type: "string", example: "Food & Dining" },
                                                    icon: { type: "string", example: "utensils" },
                                                    color: { type: "string", example: "#F59E0B" },
                                                    is_default: { type: "boolean", example: true },
                                                    created_at: { type: "string", format: "date-time" },
                                                    updated_at: { type: "string", format: "date-time" },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            post: {
                tags: ["Categories"],
                summary: "Create a custom category",
                description: "Creates a new category owned by the authenticated user. Name must be unique per user (max 80 chars). Color must be a valid 6-digit hex.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string", maxLength: 80, example: "Gym" },
                                    icon: { type: "string", example: "dumbbell", default: "tag" },
                                    color: { type: "string", example: "#10B981", default: "#6366F1", description: "Valid hex color, e.g. #FF5733" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "Category created",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "object", description: "The newly created category object" },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Validation error (missing name, invalid color, name too long)", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    409: { description: "Category name already exists for this user", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/categories/{id}": {
            put: {
                tags: ["Categories"],
                summary: "Update a custom category",
                description: "Updates name, icon, and/or color of a custom category owned by the authenticated user. Default (system) categories cannot be edited. All body fields are optional.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "category_id to update" },
                ],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string", maxLength: 80, example: "Home Gym" },
                                    icon: { type: "string", example: "barbell" },
                                    color: { type: "string", example: "#6366F1" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Category updated", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Category not found or not owned by user", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            delete: {
                tags: ["Categories"],
                summary: "Delete a custom category",
                description: "Deletes a custom category owned by the authenticated user. Default (system) categories cannot be deleted.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "category_id to delete" },
                ],
                responses: {
                    200: { description: "Category deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
                    404: { description: "Category not found or not owned by user", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        // ── Expenses ────────────────────────────────────────────────────────
        "/api/expenses": {
            get: {
                tags: ["Expenses"],
                summary: "Expense overview dashboard",
                description:
                    "Returns total count and total amount **per category** for the given date range using the `expense_overview` Supabase RPC. " +
                    "Categories with zero expenses are included (total_amount = 0). Requires `start_date` and `end_date` (max 92-day range).",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "start_date", in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-01" } },
                    { name: "end_date",   in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-31" } },
                ],
                responses: {
                    200: {
                        description: "Overview by category",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    category_id:   { type: "string", format: "uuid" },
                                                    category_name: { type: "string", example: "Food & Dining" },
                                                    icon:          { type: "string", example: "utensils" },
                                                    color:         { type: "string", example: "#F59E0B" },
                                                    expense_count: { type: "integer", example: 12 },
                                                    total_amount:  { type: "number",  example: 8450.00 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Missing or invalid date range", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            post: {
                tags: ["Expenses"],
                summary: "Create an expense",
                description: "Logs a new expense for the authenticated user. `category_id` must be a system default or a category owned by the user.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["category_id", "amount"],
                                properties: {
                                    category_id: { type: "string", format: "uuid", example: "uuid-here" },
                                    amount:      { type: "number", minimum: 0.01, example: 450.00 },
                                    note:        { type: "string", nullable: true, example: "Lunch at Thamel" },
                                    date:        { type: "string", format: "date", example: "2025-01-15", description: "Defaults to today if omitted" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: "Expense created", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Category not found or not accessible", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/expenses/category/{categoryId}": {
            get: {
                tags: ["Expenses"],
                summary: "List expenses by category",
                description: "Returns paginated individual expense records for a specific category within the date range, ordered newest-first.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "categoryId", in: "path",  required: true,  schema: { type: "string", format: "uuid" } },
                    { name: "start_date", in: "query", required: true,  schema: { type: "string", format: "date", example: "2025-01-01" } },
                    { name: "end_date",   in: "query", required: true,  schema: { type: "string", format: "date", example: "2025-01-31" } },
                    { name: "page",       in: "query", required: false, schema: { type: "integer", default: 1 } },
                    { name: "limit",      in: "query", required: false, schema: { type: "integer", default: 20, maximum: 100 } },
                ],
                responses: {
                    200: {
                        description: "Paginated expense list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { type: "object", description: "Expense record with joined category info" } },
                                        pagination: {
                                            type: "object",
                                            properties: {
                                                total:       { type: "integer", example: 45 },
                                                page:        { type: "integer", example: 1 },
                                                limit:       { type: "integer", example: 20 },
                                                total_pages: { type: "integer", example: 3 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Invalid date range", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Category not found or not accessible", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/expenses/{id}": {
            get: {
                tags: ["Expenses"],
                summary: "Get expense by ID",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "expense_id" },
                ],
                responses: {
                    200: { description: "Expense record", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    404: { description: "Expense not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            put: {
                tags: ["Expenses"],
                summary: "Update an expense",
                description: "Updates any combination of category_id, amount, note, date. All fields optional.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                ],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    category_id: { type: "string", format: "uuid" },
                                    amount:      { type: "number", minimum: 0.01, example: 500.00 },
                                    note:        { type: "string", nullable: true },
                                    date:        { type: "string", format: "date", example: "2025-01-20" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Expense updated", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Expense or category not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            delete: {
                tags: ["Expenses"],
                summary: "Delete an expense",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                ],
                responses: {
                    200: { description: "Expense deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
                    404: { description: "Expense not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        // ── Income ──────────────────────────────────────────────────────────
        "/api/income": {
            get: {
                tags: ["Income"],
                summary: "List income records",
                description:
                    "Returns paginated income records within the date range, ordered newest-first. " +
                    "Also returns `total_income` (sum for the range) alongside the paginated list. Requires `start_date` and `end_date`.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "start_date", in: "query", required: true,  schema: { type: "string", format: "date", example: "2025-01-01" } },
                    { name: "end_date",   in: "query", required: true,  schema: { type: "string", format: "date", example: "2025-01-31" } },
                    { name: "page",       in: "query", required: false, schema: { type: "integer", default: 1 } },
                    { name: "limit",      in: "query", required: false, schema: { type: "integer", default: 20, maximum: 100 } },
                ],
                responses: {
                    200: {
                        description: "Paginated income list with aggregate total",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success:      { type: "boolean", example: true },
                                        data:         { type: "array", items: { type: "object" } },
                                        total_income: { type: "number", example: 45000.00 },
                                        pagination: {
                                            type: "object",
                                            properties: {
                                                total:       { type: "integer" },
                                                page:        { type: "integer" },
                                                limit:       { type: "integer" },
                                                total_pages: { type: "integer" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Invalid date range", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            post: {
                tags: ["Income"],
                summary: "Create an income record",
                description: "Logs a new income entry. `source` max 120 chars. `date` defaults to today.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["amount"],
                                properties: {
                                    amount: { type: "number", minimum: 0.01, example: 45000.00 },
                                    source: { type: "string", maxLength: 120, nullable: true, example: "Salary" },
                                    note:   { type: "string", nullable: true, example: "March paycheck" },
                                    date:   { type: "string", format: "date", example: "2025-03-31", description: "Defaults to today if omitted" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: "Income record created", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/income/{id}": {
            get: {
                tags: ["Income"],
                summary: "Get income record by ID",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "income_id" },
                ],
                responses: {
                    200: { description: "Income record", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    404: { description: "Income record not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            put: {
                tags: ["Income"],
                summary: "Update an income record",
                description: "Updates any combination of amount, source, note, date. All fields optional.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                ],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    amount: { type: "number", minimum: 0.01, example: 50000.00 },
                                    source: { type: "string", maxLength: 120, example: "Freelance" },
                                    note:   { type: "string", nullable: true },
                                    date:   { type: "string", format: "date" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Income record updated", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Income record not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            delete: {
                tags: ["Income"],
                summary: "Delete an income record",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                ],
                responses: {
                    200: { description: "Income record deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
                    404: { description: "Income record not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        // ── Budgets ─────────────────────────────────────────────────────────
        "/api/budgets": {
            get: {
                tags: ["Budgets"],
                summary: "List budgets",
                description:
                    "Returns all budgets for the authenticated user, optionally filtered by period overlap using `start_date` / `end_date` query params (not strictly required). " +
                    "Each budget is enriched with `spent`, `remaining`, and `utilization_pct` calculated from actual expenses.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "start_date", in: "query", required: false, schema: { type: "string", format: "date", example: "2025-01-01" }, description: "Filter: period_start >= this date" },
                    { name: "end_date",   in: "query", required: false, schema: { type: "string", format: "date", example: "2025-12-31" }, description: "Filter: period_end <= this date" },
                ],
                responses: {
                    200: {
                        description: "Budget list with spending data",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    budget_id:       { type: "string", format: "uuid" },
                                                    category_id:     { type: "string", format: "uuid", nullable: true, description: "null = global budget" },
                                                    amount:          { type: "number", example: 10000.00 },
                                                    period_start:    { type: "string", format: "date" },
                                                    period_end:      { type: "string", format: "date" },
                                                    categories:      { type: "object", nullable: true, description: "Joined category name/icon/color" },
                                                    spent:           { type: "number", example: 8450.00 },
                                                    remaining:       { type: "number", example: 1550.00 },
                                                    utilization_pct: { type: "integer", example: 85 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            post: {
                tags: ["Budgets"],
                summary: "Create a budget",
                description:
                    "Creates a budget for a period. `category_id` is optional — omit it (or pass null) for a global budget covering all spending. " +
                    "Period max is 366 days. Unique constraint: one budget per (user, category, period_start, period_end).",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["amount", "period_start", "period_end"],
                                properties: {
                                    category_id:  { type: "string", format: "uuid", nullable: true, example: null, description: "null or omit for global budget" },
                                    amount:       { type: "number", minimum: 0.01, example: 10000.00 },
                                    period_start: { type: "string", format: "date", example: "2025-01-01" },
                                    period_end:   { type: "string", format: "date", example: "2025-01-31" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: "Budget created", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    400: { description: "Validation error (invalid period, amount ≤ 0, period > 366 days)", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Category not found or not accessible", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    409: { description: "Budget already exists for this category and period", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/budgets/{id}": {
            get: {
                tags: ["Budgets"],
                summary: "Get budget by ID",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "budget_id" },
                ],
                responses: {
                    200: { description: "Budget record", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    404: { description: "Budget not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            put: {
                tags: ["Budgets"],
                summary: "Update a budget",
                description: "Updates amount and/or period dates. All fields optional. Period re-validation runs if either date is changed.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                ],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    amount:       { type: "number", minimum: 0.01, example: 12000.00 },
                                    period_start: { type: "string", format: "date", example: "2025-02-01" },
                                    period_end:   { type: "string", format: "date", example: "2025-02-28" },
                                    category_id:  { type: "string", format: "uuid", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Budget updated", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } } } } },
                    400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    404: { description: "Budget not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
            delete: {
                tags: ["Budgets"],
                summary: "Delete a budget",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
                ],
                responses: {
                    200: { description: "Budget deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
                    404: { description: "Budget not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        // ── Analytics ───────────────────────────────────────────────────────
        "/api/analytics/pie": {
            get: {
                tags: ["Analytics"],
                summary: "Pie chart — expense distribution by category",
                description:
                    "Returns each category's total spending and its percentage share of overall spending within the date range. " +
                    "Sorted by total descending. Requires `start_date` and `end_date` (max 92 days).",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "start_date", in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-01" } },
                    { name: "end_date",   in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-31" } },
                ],
                responses: {
                    200: {
                        description: "Pie chart data",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success:     { type: "boolean", example: true },
                                        grand_total: { type: "number",  example: 18450.00 },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    category_id: { type: "string", format: "uuid" },
                                                    name:        { type: "string", example: "Food & Dining" },
                                                    color:       { type: "string", example: "#F59E0B" },
                                                    total:       { type: "number", example: 8450.00 },
                                                    percentage:  { type: "number", example: 45.8 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Invalid date range", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                    401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/analytics/bar": {
            get: {
                tags: ["Analytics"],
                summary: "Bar chart — monthly expense totals",
                description:
                    "Aggregates all expenses by calendar month within the date range. " +
                    "Useful for a month-by-month bar chart. Months with no spending are omitted. Requires `start_date` and `end_date`.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "start_date", in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-01" } },
                    { name: "end_date",   in: "query", required: true, schema: { type: "string", format: "date", example: "2025-03-31" } },
                ],
                responses: {
                    200: {
                        description: "Monthly bar chart data",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    month: { type: "string", example: "2025-01", description: "YYYY-MM" },
                                                    label: { type: "string", example: "Jan 2025" },
                                                    total: { type: "number", example: 18450.00 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Invalid date range", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/analytics/line": {
            get: {
                tags: ["Analytics"],
                summary: "Line chart — daily expense trend",
                description:
                    "Returns daily expense totals within the date range for a trend line chart. " +
                    "Days with no spending are omitted. Ordered by date ascending. Requires `start_date` and `end_date`.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "start_date", in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-01" } },
                    { name: "end_date",   in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-31" } },
                ],
                responses: {
                    200: {
                        description: "Daily line chart data",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    date:  { type: "string", format: "date", example: "2025-01-04" },
                                                    total: { type: "number", example: 800.00 },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Invalid date range", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
        "/api/analytics/income-vs-expense": {
            get: {
                tags: ["Analytics"],
                summary: "Income vs Expense comparison by month",
                description:
                    "Returns month-by-month income, expense, and net savings figures alongside an overall summary. " +
                    "Months are included if they have either income or expense data. Requires `start_date` and `end_date`.",
                security: [{ BearerAuth: [] }],
                parameters: [
                    { name: "start_date", in: "query", required: true, schema: { type: "string", format: "date", example: "2025-01-01" } },
                    { name: "end_date",   in: "query", required: true, schema: { type: "string", format: "date", example: "2025-03-31" } },
                ],
                responses: {
                    200: {
                        description: "Monthly income vs expense comparison",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    month:   { type: "string", example: "2025-01" },
                                                    label:   { type: "string", example: "Jan 2025" },
                                                    income:  { type: "number", example: 45000.00 },
                                                    expense: { type: "number", example: 18450.00 },
                                                    net:     { type: "number", example: 26550.00 },
                                                },
                                            },
                                        },
                                        summary: {
                                            type: "object",
                                            properties: {
                                                total_income:  { type: "number", example: 45000.00 },
                                                total_expense: { type: "number", example: 18450.00 },
                                                net:           { type: "number", example: 26550.00 },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Invalid date range", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },
    },
};

const swaggerOptions = {
    customSiteTitle: "E-Wallet API Docs",
    customCss: `
        .topbar { background-color: #1a1a2e; }
        .topbar-wrapper img { content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>'); height: 30px; }
        .topbar-wrapper a span { display: none; }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #4f46e5; }
        .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #0891b2; }
        .swagger-ui .info .title { color: #1a1a2e; }
        .swagger-ui .btn.authorize { border-color: #4f46e5; color: #4f46e5; }
        .swagger-ui .btn.authorize svg { fill: #4f46e5; }
    `,
};

module.exports = { swaggerUi, swaggerSpec, swaggerOptions };