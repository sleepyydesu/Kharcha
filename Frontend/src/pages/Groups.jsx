import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addKharchaGroupMember,
  createKharchaGroup,
  createKharchaGroupBill,
  deleteKharchaGroup,
  getGroups,
  getKharchaGroup,
  deleteKharchaGroupPicture,
  removeKharchaGroupMember,
  setKharchaGroupCashSettlement,
  updateKharchaGroup,
  uploadKharchaGroupPicture,
} from "../services/api";
import "./Groups.css";

function MemberAvatar({ person, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = person.display_name?.[0]?.toUpperCase() || "?";

  return (
    <span
      className={`kg-avatar ${person.profile_picture_url && !imageFailed ? "kg-avatar--image" : ""} ${className}`}
      title={person.display_name}
    >
      {person.profile_picture_url && !imageFailed ? (
        <img
          src={person.profile_picture_url}
          alt={person.display_name || ""}
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

export default function Groups() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const groupPictureRef = useRef(null);
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bill, setBill] = useState({ title: "", amount: "" });
  const [billMode, setBillMode] = useState("equal");
  const [customBill, setCustomBill] = useState({ title: "", shares: {} });
  const [confirmation, setConfirmation] = useState(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const load = useCallback(async () => {
    setError("");
    if (groupId) {
      const data = await getKharchaGroup(groupId);
      setGroup(data.group);
    } else {
      const data = await getGroups();
      setGroups(data.groups || []);
    }
  }, [groupId]);

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [load]);

  const openAmount = useMemo(() => {
    if (!group) return 0;
    return group.bills.reduce(
      (sum, item) => sum + item.splits.filter((split) => split.status !== "paid")
        .reduce((splitSum, split) => splitSum + Number(split.amount), 0),
      0,
    );
  }, [group]);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const data = await createKharchaGroup(name.trim());
      navigate(`/groups/${data.group.group_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    setBusy(true);
    try {
      await addKharchaGroupMember(groupId, phone);
      setPhone("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (member) => {
    setBusy(true);
    setError("");
    try {
      await removeKharchaGroupMember(groupId, member.account_id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeGroupPicture = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Group photo must be under 5 MB.");
      return;
    }
    setPictureUploading(true);
    setError("");
    try {
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read this image."));
        reader.readAsDataURL(file);
      });
      const result = await uploadKharchaGroupPicture(groupId, {
        file_base64: fileBase64,
        mime_type: file.type,
      });
      setGroup((current) => ({ ...current, picture_url: result.picture_url }));
    } catch (err) {
      setError(err.message || "Could not upload the group photo.");
    } finally {
      setPictureUploading(false);
    }
  };

  const removeGroupPicture = async () => {
    setPictureUploading(true);
    setError("");
    try {
      await deleteKharchaGroupPicture(groupId);
      setGroup((current) => ({ ...current, picture_url: null }));
    } catch (err) {
      setError(err.message || "Could not remove the group photo.");
    } finally {
      setPictureUploading(false);
    }
  };

  const askToRemoveGroupPicture = () => {
    setConfirmation({
      icon: "hide_image",
      title: "Remove group photo?",
      message: `${group.name} will return to its initials-based group icon.`,
      confirmLabel: "Remove photo",
      tone: "danger",
      action: removeGroupPicture,
    });
  };

  const openNameEditor = () => {
    setEditedName(group.name);
    setEditingName(true);
    setError("");
  };

  const saveGroupName = async () => {
    const nextName = editedName.trim();
    if (!nextName) return;
    setBusy(true);
    setError("");
    try {
      const result = await updateKharchaGroup(groupId, nextName);
      setGroup((current) => ({ ...current, name: result.group.name }));
      setEditingName(false);
    } catch (err) {
      setError(err.message || "Could not update the group name.");
    } finally {
      setBusy(false);
    }
  };

  const removeGroup = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteKharchaGroup(groupId);
      navigate("/groups", { replace: true });
    } catch (err) {
      setError(err.message || "Could not delete the group.");
      setBusy(false);
    }
  };

  const askToDeleteGroup = () => {
    setConfirmation({
      icon: "delete_forever",
      title: "Delete this group?",
      message: `${group.name}, its members, bills, payment history, and group photo will be permanently deleted.`,
      confirmLabel: "Delete group",
      tone: "danger",
      action: removeGroup,
    });
  };

  const addBill = async () => {
    setBusy(true);
    try {
      await createKharchaGroupBill(groupId, bill.title, Number(bill.amount));
      setBill({ title: "", amount: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addCustomBill = async () => {
    const splits = group.members
      .filter((member) => !member.is_current_user)
      .map((member) => ({
        account_id: member.account_id,
        amount: Number(customBill.shares[member.account_id] || 0),
      }))
      .filter((split) => split.amount > 0);
    setBusy(true);
    setError("");
    try {
      await createKharchaGroupBill(
        groupId,
        customBill.title,
        null,
        splits,
      );
      setCustomBill({ title: "", shares: {} });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setCashPayment = async (split, paid) => {
    setBusy(true);
    setError("");
    try {
      await setKharchaGroupCashSettlement(split.split_id, paid);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const askToRemoveMember = (member) => {
    setConfirmation({
      icon: "person_remove",
      title: "Remove group member?",
      message: `${member.display_name} will no longer have access to ${group.name}.`,
      confirmLabel: "Remove member",
      tone: "danger",
      action: () => removeMember(member),
    });
  };

  const askToSetCashPayment = (split, paid) => {
    setConfirmation({
      icon: paid ? "payments" : "undo",
      title: paid ? "Confirm payment?" : "Reopen this payment?",
      message: paid
        ? `Confirm that ${split.display_name} has paid Rs ${Number(split.amount).toFixed(2)}.`
        : `${split.display_name}'s share will return to payment due.`,
      confirmLabel: paid ? "Mark as settled" : "Reopen payment",
      tone: paid ? "success" : "warning",
      action: () => setCashPayment(split, paid),
    });
  };

  const runConfirmedAction = async () => {
    const action = confirmation?.action;
    setConfirmation(null);
    if (action) await action();
  };

  const paySplit = (split) => {
    const params = new URLSearchParams({
      group_split_id: split.split_id,
    });
    navigate(`/send?${params.toString()}`);
  };

  if (loading) return <div className="kg-page"><div className="kg-loading">Loading Kharcha Groups…</div></div>;

  if (!groupId) {
    return <div className="kg-page">
      <header className="kg-title-row">
        <div><span className="kg-eyebrow">Shared money, simplified</span><h1>Kharcha Groups</h1>
          <p>Create a circle for trips, flatmates, lunches, or anything worth sharing.</p></div>
      </header>
      {error && <div className="kg-error">{error}</div>}
      <section className="kg-create-card">
        <div className="kg-create-icon"><span>+</span></div>
        <div><h2>Start a new group</h2><p>You can add members by their Kharcha phone number.</p></div>
        <div className="kg-create-input"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pokhara weekend" />
          <button onClick={create} disabled={busy || !name.trim()}>Create group</button></div>
      </section>
      <section className="kg-list"><h2>Your groups</h2>
        {groups.length === 0 ? <div className="kg-empty">Your groups will appear here.</div> :
          <div className="kg-grid">{groups.map((item) => <button key={item.group_id} className="kg-card" onClick={() => navigate(`/groups/${item.group_id}`)}>
            <span className={`kg-card-icon ${item.picture_url ? "kg-card-icon--image" : ""}`}>
              {item.picture_url ? <img src={item.picture_url} alt="" /> : "👥"}
            </span><div><strong>{item.name}</strong><small>Created {new Date(item.created_at).toLocaleDateString()}</small></div><span>→</span>
          </button>)}</div>}
      </section>
    </div>;
  }

  if (!group) return null;
  return <div className="kg-page">
    <button className="kg-back" onClick={() => navigate("/groups")}>← All groups</button>
    <header className="kg-group-head"><div className="kg-group-identity">
      <input ref={groupPictureRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={changeGroupPicture} />
      <div className={`kg-group-picture ${group.picture_url ? "kg-group-picture--image" : ""}`}>
        {group.picture_url ? <img src={group.picture_url} alt={`${group.name} group`} /> : <span>{group.name?.[0]?.toUpperCase() || "G"}</span>}
        {pictureUploading && <span className="kg-picture-spinner" />}
      </div>
      <div><span className="kg-eyebrow">{group.members.length} members</span><h1>{group.name}</h1>
      <p>Rs {openAmount.toFixed(2)} still waiting to be settled.</p>
      {group.is_owner && <div className="kg-picture-actions">
        <button className="kg-group-edit-btn" onClick={openNameEditor} disabled={pictureUploading || busy}>
          Edit name
        </button>
        <button onClick={() => groupPictureRef.current?.click()} disabled={pictureUploading}>
          {group.picture_url ? "Change photo" : "Add group photo"}
        </button>
        {group.picture_url && <button className="kg-picture-remove" onClick={askToRemoveGroupPicture} disabled={pictureUploading}>Remove</button>}
        <button className="kg-group-delete-btn" onClick={askToDeleteGroup} disabled={pictureUploading || busy}>
          Delete group
        </button>
      </div>}</div>
    </div>
      <div className="kg-members">{group.members.map((member) => <MemberAvatar key={member.account_id} person={member} />)}</div>
    </header>
    {error && <div className="kg-error">{error}</div>}

    <div className="kg-layout">
      <main>
        <section className="kg-panel">
          <div className="kg-panel-head"><div><span className="kg-eyebrow">You are the receiver</span><h2>Add a bill</h2></div>
            <span className="kg-split-preview">{Math.max(group.members.length - 1, 0)} payers</span></div>
          <div className="kg-bill-mode">
            <button className={billMode === "equal" ? "active" : ""} onClick={() => setBillMode("equal")}>
              <strong>Equal bill</strong><span>Split one total evenly</span>
            </button>
            <button className={billMode === "custom" ? "active" : ""} onClick={() => setBillMode("custom")}>
              <strong>Custom bill</strong><span>Set each member’s amount</span>
            </button>
          </div>

          {billMode === "equal" ? <>
            <div className="kg-bill-form"><input value={bill.title} onChange={(e) => setBill({ ...bill, title: e.target.value })} placeholder="Dinner at Thamel" />
              <div className="kg-money-input"><span>Rs</span><input inputMode="decimal" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value })} placeholder="0.00" /></div>
              <button onClick={addBill} disabled={busy || group.members.length < 2 || !bill.title || !bill.amount}>Create equal bill</button></div>
            {bill.amount && group.members.length > 1 && <p className="kg-preview-copy">
              The other {group.members.length - 1} member{group.members.length === 2 ? "" : "s"} will pay about Rs {(Number(bill.amount) / (group.members.length - 1)).toFixed(2)} each.
            </p>}
          </> : <div className="kg-custom-bill">
            <input value={customBill.title} onChange={(e) => setCustomBill({ ...customBill, title: e.target.value })} placeholder="Bill title" />
            <div className="kg-custom-shares">
              {group.members.filter((member) => !member.is_current_user).map((member) => (
                <label key={member.account_id}>
                  <MemberAvatar person={member} />
                  <span>{member.display_name}</span>
                  <div className="kg-money-input"><span>Rs</span><input inputMode="decimal" value={customBill.shares[member.account_id] || ""}
                    onChange={(e) => setCustomBill({
                      ...customBill,
                      shares: { ...customBill.shares, [member.account_id]: e.target.value },
                    })} placeholder="0.00" /></div>
                </label>
              ))}
            </div>
            <div className="kg-custom-total"><span>Total to collect</span><strong>Rs {Object.values(customBill.shares).reduce((sum, amount) => sum + Number(amount || 0), 0).toFixed(2)}</strong></div>
            <button onClick={addCustomBill} disabled={busy || !customBill.title || !Object.values(customBill.shares).some((amount) => Number(amount) > 0)}>
              Create custom bill
            </button>
          </div>}
          {group.members.length < 2 && <p className="kg-preview-copy">Add another member before creating a bill.</p>}
        </section>

        <section className="kg-panel kg-bills"><div className="kg-panel-head"><h2>Group bills</h2></div>
          {group.bills.length === 0 ? <div className="kg-empty">No bills yet. Add one above when the receipt arrives.</div> :
            group.bills.map((item) => <article className="kg-bill" key={item.bill_id}>
              <div className="kg-bill-top"><div><strong>{item.title}</strong><span>Paid by {item.created_by_name} · {new Date(item.created_at).toLocaleDateString()}</span></div>
                <div><b>Rs {Number(item.total_amount).toFixed(2)}</b><span className={`kg-pill ${item.status}`}>{item.status}</span></div></div>
              <div className="kg-splits">{item.splits.map((split) => <div key={split.split_id} className="kg-split">
                {split.status === "paid" ? (
                  <span className="kg-check paid">✓</span>
                ) : (
                  <MemberAvatar person={split} className="kg-check" />
                )}
                <div><strong>{split.display_name}{split.is_current_user ? " (you)" : ""}</strong><small>
                  {split.status === "paid"
                    ? split.settlement_method === "cash" ? "Settled in cash" : "Settled with Kharcha"
                    : "Payment due"}
                </small></div>
                <b>Rs {Number(split.amount).toFixed(2)}</b>
                {split.is_current_user && split.status !== "paid" && <button onClick={() => paySplit(split)}>Pay</button>}
                {item.created_by === group.members.find((member) => member.is_current_user)?.account_id && split.status !== "paid" && (
                  <button className="kg-cash-btn" onClick={() => askToSetCashPayment(split, true)}>Mark settled</button>
                )}
                {item.created_by === group.members.find((member) => member.is_current_user)?.account_id && split.status === "paid" && split.settlement_method === "cash" && (
                  <button className="kg-cash-btn kg-cash-btn--reopen" onClick={() => askToSetCashPayment(split, false)}>Reopen</button>
                )}
              </div>)}</div>
            </article>)}
        </section>
      </main>

      <aside className="kg-panel kg-people"><div className="kg-panel-head"><h2>People</h2></div>
        {group.members.map((member) => <div className="kg-person" key={member.account_id}><MemberAvatar person={member} />
          <div><strong>{member.display_name}</strong><small>{member.is_current_user ? "You" : member.account_id === group.created_by ? "Owner" : "Member"}</small></div>
          {group.is_owner && member.account_id !== group.created_by && (
            <button
              className="kg-remove-person"
              onClick={() => askToRemoveMember(member)}
              disabled={busy}
              aria-label={`Remove ${member.display_name}`}
              title={`Remove ${member.display_name}`}
            >
              ×
            </button>
          )}
        </div>)}
        {group.is_owner && <div className="kg-add-person"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX or +977…" />
          <button onClick={addMember} disabled={busy || !phone}>Add member</button></div>}
      </aside>
    </div>

    {confirmation && (
      <div
        className="kg-confirm-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) {
            setConfirmation(null);
          }
        }}
      >
        <div
          className={`kg-confirm kg-confirm--${confirmation.tone}`}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="kg-confirm-title"
          aria-describedby="kg-confirm-message"
        >
          <h2 id="kg-confirm-title">{confirmation.title}</h2>
          <p id="kg-confirm-message">{confirmation.message}</p>
          <div className="kg-confirm-actions">
            <button
              className="kg-secondary"
              onClick={() => setConfirmation(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="kg-confirm-primary"
              onClick={runConfirmedAction}
              disabled={busy}
            >
              {busy ? "Please wait…" : confirmation.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    )}

    {editingName && (
      <div
        className="kg-confirm-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) {
            setEditingName(false);
          }
        }}
      >
        <div
          className="kg-confirm kg-name-editor"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kg-name-editor-title"
        >
          <div className="kg-confirm-icon">
            <span className="material-symbols-rounded">edit</span>
          </div>
          <h2 id="kg-name-editor-title">Edit group name</h2>
          <p>Choose a short name everyone in the group will recognize.</p>
          <input
            className="kg-name-editor-input"
            value={editedName}
            maxLength={100}
            autoFocus
            onChange={(event) => setEditedName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && editedName.trim() && !busy) {
                saveGroupName();
              }
              if (event.key === "Escape" && !busy) {
                setEditingName(false);
              }
            }}
          />
          <div className="kg-confirm-actions">
            <button
              className="kg-secondary"
              onClick={() => setEditingName(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="kg-confirm-primary"
              onClick={saveGroupName}
              disabled={busy || !editedName.trim()}
            >
              {busy ? "Saving…" : "Save name"}
            </button>
          </div>
        </div>
      </div>
    )}

  </div>;
}
