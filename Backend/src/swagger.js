const swaggerUi = require("swagger-ui-express");

const swaggerSpec = {
    openapi: "3.0.0",
    info: {
        title: "E-Wallet API",
        version: "1.0.0",
        description: "Backend API for the E-Wallet application. Use the signup flow in order: **check → send-otp → verify-otp → complete**. Copy the `signup_token` from verify-otp into the complete step.",
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
                description: "JWT token returned from /api/auth/signin or /api/auth/signup/complete",
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
                    account_id: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
                    account_type: { type: "string", enum: ["user", "organization", "admin"] },
                    email: { type: "string", format: "email", example: "john@example.com" },
                },
            },
            SigninAccountObject: {
                type: "object",
                properties: {
                    account_id: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
                    account_type: { type: "string", enum: ["user", "organization", "admin"] },
                    email: { type: "string", format: "email", example: "john@example.com" },
                    mpin_set: { type: "boolean", description: "Whether the user has configured their MPIN yet", example: false },
                },
            },
        },
    },
    tags: [
        { name: "Test", description: "Connection and health check routes" },
        { name: "Signup", description: "Multi-step account registration flow" },
        { name: "Auth", description: "Sign in and authentication" },
        { name: "MPIN", description: "Set up and change MPIN (requires auth token)" },
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
                description: "Queries the test table in Supabase to verify the database connection.",
                responses: {
                    200: {
                        description: "Database connected",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Database connected successfully" },
                                        data: { type: "array", items: { type: "object" } },
                                    },
                                },
                            },
                        },
                    },
                    500: { description: "Database connection failed", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        "/api/auth/signup/check": {
            post: {
                tags: ["Signup"],
                summary: "Step 1 — Check email and phone availability",
                description: "Call this first. Verifies that the email (and optional phone number) are not already registered before starting the signup flow.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "account_type"],
                                properties: {
                                    email: { type: "string", format: "email", example: "john@example.com" },
                                    phone_number: { type: "string", example: "+9779800000000" },
                                    account_type: { type: "string", enum: ["user", "organization", "admin"], example: "user" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Email and phone are available", content: { "application/json": { schema: { "$ref": "#/components/schemas/SuccessResponse" } } } },
                    400: { description: "Missing or invalid fields", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    409: {
                        description: "Email or phone already registered",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: false },
                                        field: { type: "string", example: "email" },
                                        message: { type: "string", example: "An account with this email already exists." },
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
                description: "Generates a 6-digit OTP and sends it to the provided email address. Valid for **15 minutes**. In development (no SMTP configured), the OTP is printed to the server console.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: { type: "string", format: "email", example: "john@example.com" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "OTP sent successfully", content: { "application/json": { schema: { "$ref": "#/components/schemas/SuccessResponse" } } } },
                    400: { description: "Email missing", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    500: { description: "Failed to send OTP", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        "/api/auth/signup/verify-otp": {
            post: {
                tags: ["Signup"],
                summary: "Step 3 — Verify OTP and receive signup_token",
                description: "Validates the OTP entered by the user. On success, returns a short-lived `signup_token` (valid 15 minutes). You must pass this token to the /complete step — it proves email ownership.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "otp"],
                                properties: {
                                    email: { type: "string", format: "email", example: "john@example.com" },
                                    otp: { type: "string", example: "482913" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "OTP verified — copy the signup_token for Step 4",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Email verified successfully." },
                                        signup_token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Invalid or expired OTP", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        "/api/auth/signup/complete": {
            post: {
                tags: ["Signup"],
                summary: "Step 4 — Complete signup",
                description: "Creates the account. `full_name` is required for `user` and `admin` types. `organization_name` is required for `organization`. **MPIN is not set here** — the user configures it later from their profile/settings page.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["signup_token", "account_type", "password"],
                                properties: {
                                    signup_token: { type: "string", description: "Token received from the verify-otp step", example: "eyJhbGciOiJIUzI1NiIsInR5..." },
                                    account_type: { type: "string", enum: ["user", "organization", "admin"], example: "user" },
                                    password: { type: "string", format: "password", example: "SecurePass@123" },
                                    phone_number: { type: "string", example: "+9779800000000" },
                                    full_name: { type: "string", description: "Required for user and admin", example: "John Doe" },
                                    organization_name: { type: "string", description: "Required for organization", example: "Acme Corp" },
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
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Account created successfully." },
                                        token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." },
                                        account: { "$ref": "#/components/schemas/AccountObject" },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Validation error or missing fields", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    401: { description: "signup_token expired or invalid — user must start over", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    409: { description: "Email or phone already exists", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        "/api/auth/signin": {
            post: {
                tags: ["Auth"],
                summary: "Sign in",
                description: "Single signin endpoint. `identifier` accepts **email or phone number**. `credential` accepts **password or 6-digit MPIN** — the backend auto-detects which is which.\n\n**Detection rules:**\n- `identifier`: contains `@` → treated as email, otherwise treated as phone number\n- `credential`: exactly 6 numeric digits → tried as MPIN first, then falls back to password if MPIN is not set up yet",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["identifier", "credential"],
                                properties: {
                                    identifier: { type: "string", description: "Email address or phone number", example: "john@example.com" },
                                    credential: { type: "string", description: "Password or 6-digit MPIN", example: "SecurePass@123" },
                                },
                            },
                            examples: {
                                "Email + password": { value: { identifier: "john@example.com", credential: "SecurePass@123" } },
                                "Email + MPIN": { value: { identifier: "john@example.com", credential: "123456" } },
                                "Phone + password": { value: { identifier: "+9779800000000", credential: "SecurePass@123" } },
                                "Phone + MPIN": { value: { identifier: "+9779800000000", credential: "123456" } },
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
                                        success: { type: "boolean", example: true },
                                        message: { type: "string", example: "Signed in successfully." },
                                        token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5..." },
                                        account: { "$ref": "#/components/schemas/SigninAccountObject" },
                                    },
                                },
                            },
                        },
                    },
                    400: { description: "Missing identifier or credential", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    401: { description: "Invalid credentials", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    403: { description: "Account deactivated", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        "/api/auth/mpin/setup": {
            post: {
                tags: ["MPIN"],
                summary: "Set up MPIN (first time)",
                description: "Sets the MPIN for an account that does not have one yet. Requires the account **password** to confirm identity. Returns 409 if MPIN is already set — use `/mpin/change` in that case.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["password", "mpin"],
                                properties: {
                                    password: { type: "string", format: "password", description: "Current account password to verify identity", example: "SecurePass@123" },
                                    mpin: { type: "string", description: "Exactly 6 digits", example: "123456" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "MPIN set up successfully", content: { "application/json": { schema: { "$ref": "#/components/schemas/SuccessResponse" } } } },
                    400: { description: "Missing fields or invalid MPIN format", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    401: { description: "No/invalid auth token — or incorrect password", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    409: { description: "MPIN already set — use /mpin/change instead", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                },
            },
        },

        "/api/auth/mpin/change": {
            post: {
                tags: ["MPIN"],
                summary: "Change existing MPIN",
                description: "Changes an already-configured MPIN. Requires the **current MPIN** to authorize the update. Returns 403 if no MPIN has been set up yet — use `/mpin/setup` first.",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["current_mpin", "new_mpin"],
                                properties: {
                                    current_mpin: { type: "string", description: "Your existing 6-digit MPIN", example: "123456" },
                                    new_mpin: { type: "string", description: "New 6-digit MPIN (must differ from current)", example: "654321" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "MPIN changed successfully", content: { "application/json": { schema: { "$ref": "#/components/schemas/SuccessResponse" } } } },
                    400: { description: "Missing fields, invalid format, or new MPIN same as current", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    401: { description: "No/invalid auth token — or incorrect current MPIN", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
                    403: { description: "MPIN not yet set up — use /mpin/setup first", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } },
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