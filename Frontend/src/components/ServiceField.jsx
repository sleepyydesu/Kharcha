/**
 * ServiceField.jsx
 *
 * Tiny presentational components used inside service payment forms.
 * Keeps every field consistent without pulling in the heavier InputField
 * (which is auth-styled).
 *
 * Exports:
 *   <TextField   />  – plain text / tel input
 *   <SelectField />  – native <select> with custom arrow
 *   <AmountField />  – input prefixed with "NPR"
 */

export function TextField({
  label,
  id,
  value,
  onChange,
  placeholder = "",
  type = "text",
  error,
  maxLength,
  inputMode,
}) {
  return (
    <div className="spp-field">
      <label className="spp-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`spp-field__input${error ? " has-error" : ""}`}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
      />
      {error && <p className="spp-field__error">⚠ {error}</p>}
    </div>
  );
}

export function SelectField({ label, id, value, onChange, options, error }) {
  return (
    <div className="spp-field">
      <label className="spp-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="spp-field__select-wrap">
        <select
          id={id}
          className={`spp-field__select${error ? " has-error" : ""}`}
          value={value}
          onChange={onChange}
        >
          <option value="">— Select —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="spp-field__error">⚠ {error}</p>}
    </div>
  );
}

export function AmountField({
  label,
  id,
  value,
  onChange,
  error,
  placeholder = "0.00",
}) {
  return (
    <div className="spp-field">
      <label className="spp-field__label" htmlFor={id}>
        {label}
      </label>
      <div className={`spp-field__amount-wrap${error ? " has-error" : ""}`}>
        <span className="spp-field__amount-prefix">NPR</span>
        <input
          id={id}
          className="spp-field__amount-input"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {error && <p className="spp-field__error">⚠ {error}</p>}
    </div>
  );
}
