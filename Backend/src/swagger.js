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
                    "Sends money from the caller's wallet to another account. `receiver_identifier` accepts a **phone number** or **account UUID**. The transfer is executed atomically in the database — balance is checked, both wallets are updated, and the transaction is recorded in a single PostgreSQL function call. Rate limited.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["receiver_identifier", "amount"],
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
                            "Validation error, insufficient balance, inactive wallet, or self-transfer",
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
