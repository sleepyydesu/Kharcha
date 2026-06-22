const supabase = require("../services/supabaseClient");
const GROUP_PICTURE_BUCKET = "profile-pictures";
const MAX_GROUP_PICTURE_BYTES = 5 * 1024 * 1024;
const GROUP_PICTURE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function normalizeNepalPhone(value) {
  const compact = String(value || "").trim().replace(/[\s()-]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("977")) return `+${compact}`;
  if (compact.startsWith("0")) return `+977${compact.slice(1)}`;
  return `+977${compact}`;
}

async function assertMembership(groupId, accountId) {
  const { data, error } = await supabase
    .from("kharcha_group_members")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function accountProfiles(accountIds) {
  if (!accountIds.length) return {};
  const [{ data: accounts }, { data: users }, { data: organizations }] =
    await Promise.all([
      supabase.from("accounts").select("account_id, phone_number, account_type, profile_picture_url").in("account_id", accountIds),
      supabase.from("users").select("account_id, full_name").in("account_id", accountIds),
      supabase.from("organizations").select("account_id, organization_name").in("account_id", accountIds),
    ]);
  const profiles = {};
  (users || []).forEach((row) => {
    profiles[row.account_id] = { display_name: row.full_name };
  });
  (organizations || []).forEach((row) => {
    profiles[row.account_id] = { display_name: row.organization_name };
  });
  (accounts || []).forEach((row) => {
    profiles[row.account_id] = {
      ...profiles[row.account_id],
      display_name: profiles[row.account_id]?.display_name || row.phone_number || "Kharcha user",
      profile_picture_url: row.profile_picture_url || null,
    };
  });
  return profiles;
}

const listGroups = async (req, res) => {
  try {
    const { data: memberships, error } = await supabase
      .from("kharcha_group_members")
      .select("group_id")
      .eq("account_id", req.account.account_id);
    if (error) throw error;
    const ids = (memberships || []).map((row) => row.group_id);
    if (!ids.length) return res.json({ success: true, groups: [] });
    const { data: groups, error: groupError } = await supabase
      .from("kharcha_groups")
      .select("group_id, name, created_by, picture_url, created_at")
      .in("group_id", ids)
      .order("created_at", { ascending: false });
    if (groupError) throw groupError;
    return res.json({ success: true, groups });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Could not load groups.", error: err.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Group name is required." });
    const { data: group, error } = await supabase
      .from("kharcha_groups")
      .insert({ name: name.slice(0, 100), created_by: req.account.account_id })
      .select()
      .single();
    if (error) throw error;
    const { error: memberError } = await supabase
      .from("kharcha_group_members")
      .insert({ group_id: group.group_id, account_id: req.account.account_id });
    if (memberError) throw memberError;
    return res.status(201).json({ success: true, group });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Could not create group.", error: err.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Group name must be between 1 and 100 characters.",
      });
    }
    const { data: group, error } = await supabase
      .from("kharcha_groups")
      .update({ name })
      .eq("group_id", req.params.groupId)
      .eq("created_by", req.account.account_id)
      .select("group_id, name, picture_url")
      .maybeSingle();
    if (error) throw error;
    if (!group) {
      return res.status(403).json({
        success: false,
        message: "Only the group owner can rename this group.",
      });
    }
    return res.json({
      success: true,
      message: "Group name updated.",
      group,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not update the group name.",
      error: err.message,
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { data: group, error: groupError } = await supabase
      .from("kharcha_groups")
      .select("group_id, created_by")
      .eq("group_id", req.params.groupId)
      .maybeSingle();
    if (groupError) throw groupError;
    if (!group || group.created_by !== req.account.account_id) {
      return res.status(403).json({
        success: false,
        message: "Only the group owner can delete this group.",
      });
    }

    await supabase.storage.from(GROUP_PICTURE_BUCKET).remove(
      ["jpg", "png", "webp"].map(
        (ext) => `groups/${req.params.groupId}/group.${ext}`,
      ),
    );
    const { error } = await supabase
      .from("kharcha_groups")
      .delete()
      .eq("group_id", req.params.groupId)
      .eq("created_by", req.account.account_id);
    if (error) throw error;
    return res.json({
      success: true,
      message: "Group deleted permanently.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not delete the group.",
      error: err.message,
    });
  }
};

const getGroup = async (req, res) => {
  try {
    if (!(await assertMembership(req.params.groupId, req.account.account_id))) {
      return res.status(403).json({ success: false, message: "You are not a member of this group." });
    }
    const [{ data: group, error }, { data: members }, { data: bills }] = await Promise.all([
      supabase.from("kharcha_groups").select("*").eq("group_id", req.params.groupId).single(),
      supabase.from("kharcha_group_members").select("account_id, joined_at").eq("group_id", req.params.groupId),
      supabase.from("kharcha_group_bills").select("*, kharcha_group_bill_splits(*)").eq("group_id", req.params.groupId).order("created_at", { ascending: false }),
    ]);
    if (error) throw error;
    const ids = [
      ...new Set([
        ...(members || []).map((member) => member.account_id),
        ...(bills || []).flatMap((bill) =>
          (bill.kharcha_group_bill_splits || []).map((split) => split.account_id),
        ),
      ]),
    ];
    const profiles = await accountProfiles(ids);
    return res.json({
      success: true,
      group: {
        ...group,
        is_owner: group.created_by === req.account.account_id,
        members: (members || []).map((member) => ({
          ...member,
          display_name: profiles[member.account_id]?.display_name,
          profile_picture_url: profiles[member.account_id]?.profile_picture_url || null,
          is_current_user: member.account_id === req.account.account_id,
        })),
        bills: (bills || []).map((bill) => ({
          ...bill,
          created_by_name: profiles[bill.created_by]?.display_name,
          created_by_profile_picture_url:
            profiles[bill.created_by]?.profile_picture_url || null,
          splits: (bill.kharcha_group_bill_splits || []).map((split) => ({
            ...split,
            display_name: profiles[split.account_id]?.display_name,
            profile_picture_url: profiles[split.account_id]?.profile_picture_url || null,
            is_current_user: split.account_id === req.account.account_id,
          })),
          kharcha_group_bill_splits: undefined,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Could not load group.", error: err.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { data: group } = await supabase
      .from("kharcha_groups")
      .select("created_by")
      .eq("group_id", req.params.groupId)
      .maybeSingle();
    if (!group || group.created_by !== req.account.account_id) {
      return res.status(403).json({ success: false, message: "Only the group owner can add members." });
    }
    const phone = normalizeNepalPhone(req.body.phone_number);
    if (!/^\+977\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid Nepali phone number.",
      });
    }
    const { data: account, error } = await supabase
      .from("accounts")
      .select("account_id, is_active")
      .eq("phone_number", phone)
      .maybeSingle();
    if (error) throw error;
    if (!account || !account.is_active) {
      return res.status(404).json({ success: false, message: "No active Kharcha account uses that phone number." });
    }
    const { error: insertError } = await supabase
      .from("kharcha_group_members")
      .upsert({ group_id: req.params.groupId, account_id: account.account_id });
    if (insertError) throw insertError;
    return res.json({ success: true, message: "Member added." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Could not add member.", error: err.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const { groupId, accountId } = req.params;
    const { data: group, error: groupError } = await supabase
      .from("kharcha_groups")
      .select("created_by")
      .eq("group_id", groupId)
      .maybeSingle();
    if (groupError) throw groupError;
    if (!group || group.created_by !== req.account.account_id) {
      return res.status(403).json({
        success: false,
        message: "Only the group owner can remove members.",
      });
    }
    if (accountId === group.created_by) {
      return res.status(400).json({
        success: false,
        message: "The group owner cannot remove themselves.",
      });
    }

    const { count, error: billError } = await supabase
      .from("kharcha_group_bills")
      .select("bill_id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("status", "open");
    if (billError) throw billError;
    if (count > 0) {
      return res.status(409).json({
        success: false,
        message: "Settle all open bills before removing a member.",
      });
    }

    const { data: removed, error } = await supabase
      .from("kharcha_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("account_id", accountId)
      .select("account_id")
      .maybeSingle();
    if (error) throw error;
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this group.",
      });
    }
    return res.json({ success: true, message: "Member removed." });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not remove member.",
      error: err.message,
    });
  }
};

const uploadGroupPicture = async (req, res) => {
  try {
    const { data: group, error: groupError } = await supabase
      .from("kharcha_groups")
      .select("created_by")
      .eq("group_id", req.params.groupId)
      .maybeSingle();
    if (groupError) throw groupError;
    if (!group || group.created_by !== req.account.account_id) {
      return res.status(403).json({
        success: false,
        message: "Only the group owner can change the group photo.",
      });
    }

    const { file_base64, mime_type } = req.body;
    if (!file_base64 || !GROUP_PICTURE_MIME_TYPES.includes(mime_type)) {
      return res.status(400).json({
        success: false,
        message: "Choose a JPEG, PNG, or WebP image.",
      });
    }
    const fileBuffer = Buffer.from(file_base64, "base64");
    if (fileBuffer.byteLength > MAX_GROUP_PICTURE_BYTES) {
      return res.status(400).json({
        success: false,
        message: "Image must be under 5 MB.",
      });
    }

    const ext = mime_type.split("/")[1].replace("jpeg", "jpg");
    const storagePath = `groups/${req.params.groupId}/group.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(GROUP_PICTURE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mime_type,
        upsert: true,
      });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage
      .from(GROUP_PICTURE_BUCKET)
      .getPublicUrl(storagePath);
    const pictureUrl = `${publicData.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("kharcha_groups")
      .update({ picture_url: pictureUrl })
      .eq("group_id", req.params.groupId);
    if (updateError) throw updateError;
    return res.json({
      success: true,
      message: "Group photo updated.",
      picture_url: pictureUrl,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not upload the group photo.",
      error: err.message,
    });
  }
};

const deleteGroupPicture = async (req, res) => {
  try {
    const { data: group, error: groupError } = await supabase
      .from("kharcha_groups")
      .select("created_by")
      .eq("group_id", req.params.groupId)
      .maybeSingle();
    if (groupError) throw groupError;
    if (!group || group.created_by !== req.account.account_id) {
      return res.status(403).json({
        success: false,
        message: "Only the group owner can remove the group photo.",
      });
    }
    await supabase.storage.from(GROUP_PICTURE_BUCKET).remove(
      ["jpg", "png", "webp"].map(
        (ext) => `groups/${req.params.groupId}/group.${ext}`,
      ),
    );
    const { error } = await supabase
      .from("kharcha_groups")
      .update({ picture_url: null })
      .eq("group_id", req.params.groupId);
    if (error) throw error;
    return res.json({ success: true, message: "Group photo removed." });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not remove the group photo.",
      error: err.message,
    });
  }
};

const createBill = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    if (!(await assertMembership(groupId, req.account.account_id))) {
      return res.status(403).json({ success: false, message: "You are not a member of this group." });
    }
    const title = String(req.body.title || "").trim();
    const requestedSplits = Array.isArray(req.body.splits) ? req.body.splits : null;
    const total = requestedSplits
      ? requestedSplits.reduce((sum, split) => sum + Number(split.amount || 0), 0)
      : Number(req.body.amount);
    if (!title || !Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ success: false, message: "Enter a title and valid share amounts." });
    }
    const { data: members, error: membersError } = await supabase
      .from("kharcha_group_members")
      .select("account_id")
      .eq("group_id", groupId)
      .order("joined_at");
    if (membersError) throw membersError;
    const otherMembers = members.filter(
      (member) => member.account_id !== req.account.account_id,
    );
    if (!otherMembers.length) {
      return res.status(400).json({
        success: false,
        message: "Add at least one other member before creating a bill.",
      });
    }
    const payerIds = new Set(
      otherMembers.map((member) => member.account_id),
    );
    let splits;
    if (requestedSplits) {
      splits = requestedSplits
        .map((split) => ({
          account_id: String(split.account_id || ""),
          amount: Number(split.amount),
        }))
        .filter((split) => split.amount > 0);
      const seen = new Set();
      const invalid = splits.some(
        (split) => {
          const duplicate = seen.has(split.account_id);
          seen.add(split.account_id);
          return (
            !payerIds.has(split.account_id) ||
            duplicate ||
            !Number.isFinite(split.amount)
          );
        },
      );
      if (invalid || !splits.length) {
        return res.status(400).json({
          success: false,
          message: "Custom shares must belong to unique group members other than the bill creator.",
        });
      }
    } else {
      const totalPaisa = Math.round(total * 100);
      const base = Math.floor(totalPaisa / members.length);
      let remainder = totalPaisa - base * members.length;
      splits = members.map((member) => {
        const extra = remainder > 0 ? 1 : 0;
        remainder -= extra;
        const isCreator = member.account_id === req.account.account_id;
        return {
          account_id: member.account_id,
          amount: (base + extra) / 100,
          status: isCreator ? "paid" : "pending",
          settlement_method: isCreator ? "self" : null,
          paid_at: isCreator ? new Date().toISOString() : null,
        };
      });
    }
    const { data: bill, error } = await supabase
      .from("kharcha_group_bills")
      .insert({ group_id: groupId, created_by: req.account.account_id, title, total_amount: total })
      .select()
      .single();
    if (error) throw error;
    const splitRows = splits.map((split) => ({
      bill_id: bill.bill_id,
      account_id: split.account_id,
      amount: split.amount,
      status: split.status || "pending",
      settlement_method: split.settlement_method || null,
      paid_at: split.paid_at || null,
    }));
    const { error: splitError } = await supabase.from("kharcha_group_bill_splits").insert(splitRows);
    if (splitError) throw splitError;
    return res.status(201).json({ success: true, bill });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Could not split the bill.", error: err.message });
  }
};

const setCashSettlement = async (req, res) => {
  try {
    const paid = req.body.paid !== false;
    const { data: split, error } = await supabase
      .from("kharcha_group_bill_splits")
      .select("split_id, status, kharcha_group_bills!inner(bill_id, created_by)")
      .eq("split_id", req.params.splitId)
      .maybeSingle();
    if (error) throw error;
    if (!split) {
      return res.status(404).json({ success: false, message: "Bill share not found." });
    }
    const bill = split.kharcha_group_bills;
    if (bill.created_by !== req.account.account_id) {
      return res.status(403).json({
        success: false,
        message: "Only the bill creator can record cash payments.",
      });
    }
    if (!paid && split.status === "paid") {
      const { data: current } = await supabase
        .from("kharcha_group_bill_splits")
        .select("settlement_method")
        .eq("split_id", split.split_id)
        .single();
      if (current?.settlement_method !== "cash") {
        return res.status(409).json({
          success: false,
          message: "Kharcha wallet payments cannot be reverted from the group.",
        });
      }
    }
    const { error: updateError } = await supabase
      .from("kharcha_group_bill_splits")
      .update(
        paid
          ? {
              status: "paid",
              settlement_method: "cash",
              paid_at: new Date().toISOString(),
              transaction_id: null,
            }
          : {
              status: "pending",
              settlement_method: null,
              paid_at: null,
              transaction_id: null,
            },
      )
      .eq("split_id", split.split_id);
    if (updateError) throw updateError;

    const { count } = await supabase
      .from("kharcha_group_bill_splits")
      .select("split_id", { count: "exact", head: true })
      .eq("bill_id", bill.bill_id)
      .neq("status", "paid");
    await supabase
      .from("kharcha_group_bills")
      .update({ status: count === 0 ? "settled" : "open" })
      .eq("bill_id", bill.bill_id);
    return res.json({
      success: true,
      message: paid ? "Cash payment recorded." : "Cash settlement reopened.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not update the cash settlement.",
      error: err.message,
    });
  }
};

const getSplitPaymentContext = async (req, res) => {
  try {
    const { data: split, error } = await supabase
      .from("kharcha_group_bill_splits")
      .select(
        "split_id, amount, status, kharcha_group_bills!inner(bill_id, title, created_by, group_id, kharcha_groups!inner(group_id, name))",
      )
      .eq("split_id", req.params.splitId)
      .eq("account_id", req.account.account_id)
      .maybeSingle();
    if (error) throw error;
    if (!split) {
      return res.status(404).json({
        success: false,
        message: "This group payment was not found.",
      });
    }
    if (split.status === "paid") {
      return res.status(409).json({
        success: false,
        message: "This group share is already settled.",
      });
    }
    const bill = split.kharcha_group_bills;
    const profiles = await accountProfiles([bill.created_by]);
    const receiver = profiles[bill.created_by] || {};
    return res.json({
      success: true,
      payment: {
        split_id: split.split_id,
        amount: Number(split.amount),
        note: `Kharcha Group: ${bill.title}`,
        receiver: {
          account_id: bill.created_by,
          display_name: receiver.display_name || "Bill creator",
          profile_picture: receiver.profile_picture_url || null,
        },
        group: {
          group_id: bill.group_id,
          name: bill.kharcha_groups?.name || "Kharcha Group",
          return_to: `/groups/${bill.group_id}`,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not prepare this group payment.",
      error: err.message,
    });
  }
};

const settleSplit = async (req, res) => {
  try {
    const transactionId = String(req.body.transaction_id || "").trim();
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "transaction_id is required.",
      });
    }
    const { data: split, error } = await supabase
      .from("kharcha_group_bill_splits")
      .select("split_id, amount, status, kharcha_group_bills!inner(bill_id, title, created_by, status)")
      .eq("split_id", req.params.splitId)
      .eq("account_id", req.account.account_id)
      .single();
    if (error) throw error;
    if (split.status === "paid") {
      return res.json({ success: true, message: "This share is already settled." });
    }
    const bill = split.kharcha_group_bills;
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("transaction_id, sender_account_id, receiver_account_id, amount")
      .eq("transaction_id", transactionId)
      .maybeSingle();
    if (transactionError) throw transactionError;
    const amountMatches =
      Math.round(Number(transaction?.amount) * 100) ===
      Math.round(Number(split.amount) * 100);
    if (
      !transaction ||
      transaction.sender_account_id !== req.account.account_id ||
      transaction.receiver_account_id !== bill.created_by ||
      !amountMatches
    ) {
      return res.status(400).json({
        success: false,
        message: "That transfer does not match this group payment.",
      });
    }
    const { data: usedTransaction, error: usedError } = await supabase
      .from("kharcha_group_bill_splits")
      .select("split_id")
      .eq("transaction_id", transaction.transaction_id)
      .neq("split_id", split.split_id)
      .maybeSingle();
    if (usedError) throw usedError;
    if (usedTransaction) {
      return res.status(409).json({
        success: false,
        message: "This transfer has already settled another group share.",
      });
    }
    await supabase.from("kharcha_group_bill_splits").update({
      status: "paid",
      settlement_method: "kharcha",
      paid_at: new Date().toISOString(),
      transaction_id: transaction.transaction_id,
    }).eq("split_id", split.split_id);
    const { count } = await supabase.from("kharcha_group_bill_splits")
      .select("split_id", { count: "exact", head: true })
      .eq("bill_id", bill.bill_id).neq("status", "paid");
    if (count === 0) {
      await supabase.from("kharcha_group_bills").update({ status: "settled" }).eq("bill_id", bill.bill_id);
    }
    return res.json({ success: true, message: "Your share is settled." });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not verify this group payment.",
      error: err.message,
    });
  }
};

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  addMember,
  removeMember,
  uploadGroupPicture,
  deleteGroupPicture,
  createBill,
  setCashSettlement,
  getSplitPaymentContext,
  settleSplit,
};
