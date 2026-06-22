const crypto = require("crypto");
const supabase = require("../services/supabaseClient");

const SERVICE_DEFINITIONS = {
  topup: {
    label: "Mobile Topup",
    orgTypeId: 2,
    identifierLabel: "Mobile number",
    amountRange: [50, 1000],
  },
  landline: {
    label: "Landline Bill",
    orgTypeId: 2,
    identifierLabel: "Landline number",
    amountRange: [180, 1400],
  },
  water: {
    label: "Water Bill",
    orgTypeId: 3,
    identifierLabel: "Customer ID",
    amountRange: [220, 1800],
  },
  electricity: {
    label: "Electricity Bill",
    orgTypeId: 4,
    identifierLabel: "SC number",
    amountRange: [650, 6500],
  },
  education: {
    label: "School / College Fee",
    orgTypeId: 5,
    identifierLabel: "Student ID",
    amountRange: [2500, 25000],
  },
  internet: {
    label: "Internet Bill",
    orgTypeId: 6,
    identifierLabel: "Username / Customer ID",
    amountRange: [850, 2600],
  },
};

const TEST_IDENTIFIERS = {
  topup: {
    Ncell: "9800000001",
    NTC: "9841000001",
  },
  landline: {
    NTC: "014123456",
  },
  water: {
    "Community Khanepani": "CKWS-1001",
    KUKL: "KUKL-1001",
  },
  electricity: {
    NEA: "NEA-1001",
  },
  education: {
    "Herald College Kathmandu": "HCK-1001",
    "Islington College": "IC-1001",
    "Kavya School": "KAVYA-1001",
    "Apex College": "APEX-1001",
  },
  internet: {
    "Worldlink Communications": "WORLDLINK-DEMO",
    "Vianet Communications": "VIANET-DEMO",
    Subisu: "SUBISU-DEMO",
    "NT FTTH": "NTFTTH-DEMO",
    "Dishhome FTTH": "DISHHOME-DEMO",
  },
};

function fallbackIdentifier(service, organizationName) {
  const prefix = organizationName
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 10)
    .toUpperCase();
  return service === "topup" ? "9800000000" : `${prefix || "KHARCHA"}-DEMO`;
}

function getTestIdentifier(service, organizationName) {
  return (
    TEST_IDENTIFIERS[service]?.[organizationName] ||
    fallbackIdentifier(service, organizationName)
  );
}

function deterministicAmount({
  service,
  organizationId,
  identifier,
  billSequence,
  range,
}) {
  const digest = crypto
    .createHash("sha256")
    .update(
      `${service}:${organizationId}:${identifier}:bill-${billSequence}`,
    )
    .digest();
  const [min, max] = range;
  const step = service === "topup" ? 10 : 5;
  const slots = Math.floor((max - min) / step) + 1;
  return min + (digest.readUInt32BE(0) % slots) * step;
}

function customerName(service, organizationName) {
  if (service === "education") return "Aarav Sharma";
  if (service === "topup" || service === "landline") return "Sanjay Karki";
  return `${organizationName} Demo Customer`;
}

const getCatalog = async (req, res) => {
  try {
    const { data: organizations, error } = await supabase
      .from("organizations")
      .select("organization_id, account_id, organization_name, org_type_id")
      .order("organization_name", { ascending: true });

    if (error) throw error;

    const accountIds = (organizations || []).map((org) => org.account_id);
    const { data: accounts, error: accountsError } = accountIds.length
      ? await supabase
          .from("accounts")
          .select("account_id, profile_picture_url")
          .in("account_id", accountIds)
      : { data: [], error: null };
    if (accountsError) throw accountsError;
    const logos = new Map(
      (accounts || []).map((account) => [
        account.account_id,
        account.profile_picture_url,
      ]),
    );

    const services = Object.entries(SERVICE_DEFINITIONS).map(([key, value]) => ({
      key,
      label: value.label,
      org_type_id: value.orgTypeId,
      identifier_label: value.identifierLabel,
    }));

    const providers = (organizations || []).map((org) => ({
      organization_id: org.organization_id,
      account_id: org.account_id,
      organization_name: org.organization_name,
      org_type_id: org.org_type_id,
      logo_url: logos.get(org.account_id) || null,
    }));

    return res.status(200).json({ success: true, services, providers });
  } catch (err) {
    console.error("[getServiceCatalog]", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load service providers.",
    });
  }
};

const getTestAccounts = async (req, res) => {
  try {
    const service = String(req.query.service || "").toLowerCase();
    const definition = SERVICE_DEFINITIONS[service];
    if (!definition) {
      return res.status(400).json({
        success: false,
        message: "A valid service is required.",
      });
    }

    const { data: organizations, error } = await supabase
      .from("organizations")
      .select("organization_id, organization_name")
      .eq("org_type_id", definition.orgTypeId)
      .order("organization_name", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      service,
      test_accounts: (organizations || []).map((org) => ({
        organization_id: org.organization_id,
        organization_name: org.organization_name,
        test_identifier: getTestIdentifier(service, org.organization_name),
      })),
    });
  } catch (err) {
    console.error("[getServiceTestAccounts]", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load test accounts.",
    });
  }
};

const lookupBill = async (req, res) => {
  try {
    const service = String(req.body.service || "").toLowerCase();
    const organizationId = String(req.body.organization_id || "").trim();
    const identifier = String(req.body.identifier || "").trim();
    const definition = SERVICE_DEFINITIONS[service];

    if (!definition || !organizationId || !identifier) {
      return res.status(400).json({
        success: false,
        message: "service, organization_id, and identifier are required.",
      });
    }

    const { data: organization, error } = await supabase
      .from("organizations")
      .select("organization_id, account_id, organization_name, org_type_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw error;
    if (!organization || organization.org_type_id !== definition.orgTypeId) {
      return res.status(404).json({
        success: false,
        message: "Provider is not available for this service.",
      });
    }

    const expectedIdentifier = getTestIdentifier(
      service,
      organization.organization_name,
    );

    if (identifier.toUpperCase() !== expectedIdentifier.toUpperCase()) {
      return res.status(404).json({
        success: false,
        message: `Account not found. Use the test ${definition.identifierLabel.toLowerCase()}: ${expectedIdentifier}`,
        test_identifier: expectedIdentifier,
      });
    }

    const remarksPrefix = `${definition.label} · ${organization.organization_name} · ${expectedIdentifier} · Ref `;
    const { count: paidBillCount, error: paymentCountError } = await supabase
      .from("transactions")
      .select("transaction_id", { count: "exact", head: true })
      .eq("receiver_account_id", organization.account_id)
      .eq("status", "completed")
      .ilike("remarks", `${remarksPrefix}%`);

    if (paymentCountError) throw paymentCountError;

    const billSequence = paidBillCount || 0;
    const amount = deterministicAmount({
      service,
      organizationId,
      identifier: expectedIdentifier,
      billSequence,
      range: definition.amountRange,
    });
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 7);
    const reference = crypto
      .createHash("sha1")
      .update(
        `${service}:${organizationId}:${expectedIdentifier}:bill-${billSequence}`,
      )
      .digest("hex")
      .slice(0, 10)
      .toUpperCase();

    return res.status(200).json({
      success: true,
      bill: {
        service,
        service_label: definition.label,
        organization_id: organization.organization_id,
        receiver_account_id: organization.account_id,
        organization_name: organization.organization_name,
        identifier: expectedIdentifier,
        identifier_label: definition.identifierLabel,
        customer_name: customerName(service, organization.organization_name),
        amount,
        currency: "NPR",
        bill_reference: reference,
        bill_sequence: billSequence + 1,
        billing_period: now.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kathmandu",
        }),
        due_date: dueDate.toISOString(),
      },
    });
  } catch (err) {
    console.error("[lookupServiceBill]", err);
    return res.status(500).json({
      success: false,
      message: "Bill lookup failed. Please try again.",
    });
  }
};

module.exports = {
  getCatalog,
  getTestAccounts,
  lookupBill,
};
