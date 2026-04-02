// ResetForm.jsx
// 3-step Reset Password flow:
//   Step 1 → Enter phone number (sends OTP)
//   Step 2 → Enter the 6-digit OTP
//   Step 3 → Set a new password

import { useState, useRef } from 'react';
import InputField from './InputField';
import Toast from './Toast';

function ResetForm({ onBack }) {
  const [step, setStep]               = useState(1);
  const [phone, setPhone]             = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors]           = useState({});
  const [toast, setToast]             = useState(null);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) otpRefs[index + 1].current.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  }

  // Step 1: validate phone and "send" OTP
  function handleSendOtp() {
    const e = {};
    if (!phone) {
      e.phone = 'Phone number is required';
    } else if (!/^(97|98)\d{8}$/.test(phone)) {
      e.phone = 'Enter a valid Nepali number (97XXXXXXXX or 98XXXXXXXX)';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    showToast(`OTP sent to ${phone} 📱`, 'success');
    setStep(2);
  }

  // Step 2: verify OTP
  function handleVerifyOtp() {
    if (otp.some(d => d === '')) {
      setErrors({ otp: 'Please enter the complete 6-digit OTP' });
      return;
    }
    showToast('OTP verified! Now set your new password.', 'success');
    setStep(3);
  }

  // Step 3: set new password
  function handleResetPassword() {
    const e = {};
    if (!newPassword) {
      e.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      e.newPassword = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      e.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    showToast('Password reset successful! Please log in. ✅', 'success');
    setTimeout(() => onBack(), 2000);
  }

  const passwordMatch =
    newPassword.length >= 8 && confirmPassword === newPassword && confirmPassword !== '';

  const step3Ready = newPassword.length >= 8 && confirmPassword === newPassword;

  return (
    <div className="form-body slide-in">

      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ── STEP 1: Enter Phone ── */}
      {step === 1 && (
        <div className="slide-in">
          <h2 className="step-title">Reset Password</h2>
          <p className="step-subtitle">
            Enter your registered phone number. We'll send you a one-time code.
          </p>

          <InputField
            label="Phone Number"
            type="tel"
            placeholder="98XXXXXXXX"
            value={phone}
            onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
            icon="phone"
            error={errors.phone}
            maxLength={10}
          />

          <button
            className="btn-primary"
            onClick={handleSendOtp}
            disabled={phone.length !== 10}
          >
            Send OTP →
          </button>
          <button className="btn-secondary" onClick={onBack}>← Back to Login</button>
        </div>
      )}

      {/* ── STEP 2: Enter OTP ── */}
      {step === 2 && (
        <div className="slide-in">
          <h2 className="step-title">Enter OTP</h2>
          <p className="otp-info">
            We sent a 6-digit code to <span className="otp-phone">{phone}</span>.
          </p>

          <div className="otp-row">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={otpRefs[i]}
                className="otp-box"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                aria-label={`OTP digit ${i + 1}`}
              />
            ))}
          </div>

          {errors.otp && (
            <span className="error-msg" style={{ display: 'block', textAlign: 'center', marginBottom: '8px' }}>
              ⚠ {errors.otp}
            </span>
          )}

          <p style={{ textAlign: 'center', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Didn't receive it?{' '}
            <button className="resend-link" onClick={() => showToast('OTP resent to ' + phone, 'success')}>
              Resend OTP
            </button>
          </p>

          <button
            className="btn-primary"
            onClick={handleVerifyOtp}
            disabled={otp.some(d => d === '')}
          >
            Verify OTP →
          </button>
          <button className="btn-secondary" onClick={() => setStep(1)}>← Change Number</button>
        </div>
      )}

      {/* ── STEP 3: New Password ── */}
      {step === 3 && (
        <div className="slide-in">
          <h2 className="step-title">New Password</h2>
          <p className="step-subtitle">Choose a strong password (at least 8 characters).</p>

          <InputField
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setErrors(p => ({ ...p, newPassword: '' })); }}
            icon="lock"
            error={errors.newPassword}
          />

          <InputField
            label="Confirm New Password"
            type="password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
            icon="check"
            error={errors.confirmPassword}
            success={passwordMatch ? 'Passwords match!' : ''}
          />

          <button className="btn-primary" onClick={handleResetPassword} disabled={!step3Ready}>
            Reset Password ✓
          </button>
          <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
        </div>
      )}

    </div>
  );
}

export default ResetForm;
