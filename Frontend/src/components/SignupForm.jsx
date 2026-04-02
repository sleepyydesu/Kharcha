// SignupForm.jsx
// Multi-step registration: Account Type → Details → OTP Verification

import { useState, useRef } from 'react';
import InputField from './InputField';
import Toast from './Toast';

// ── Progress Bar ──────────────────────────────────────────────
function ProgressBar({ currentStep }) {
  const steps = [1, 2, 3];
  return (
    <div className="progress-bar">
      {steps.map((step, i) => (
        <span key={step} style={{ display: 'contents' }}>
          <div className={`step-dot ${currentStep > step ? 'done' : currentStep === step ? 'active' : ''}`}>
            {currentStep > step ? '✓' : step}
          </div>
          {i < steps.length - 1 && (
            <div className={`step-line ${currentStep > step ? 'done' : ''}`} />
          )}
        </span>
      ))}
    </div>
  );
}

// ── Main SignupForm ───────────────────────────────────────────
function SignupForm() {
  const [step, setStep]         = useState(1);
  const [userType, setUserType] = useState('');
  const [form, setForm]         = useState({
    fullName: '', orgName: '', phone: '', password: '', confirmPassword: '',
  });
  const [otp, setOtp]     = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});
  const [toast, setToast]   = useState(null);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }

  // OTP: type a digit and auto-advance to next box
  function handleOtpChange(index, value) {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) otpRefs[index + 1].current.focus();
  }

  // OTP: backspace moves focus to the previous box
  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  }

  function validateStep1() {
    if (!userType) {
      setErrors({ userType: 'Please select an account type to continue' });
      return false;
    }
    return true;
  }

  function validateStep2() {
    const e = {};
    if (userType === 'personal') {
      if (!form.fullName.trim()) e.fullName = 'Full name is required';
    } else {
      if (!form.orgName.trim()) e.orgName = 'Organization name is required';
    }
    if (!form.phone) {
      e.phone = 'Phone number is required';
    } else if (!/^(97|98)\d{8}$/.test(form.phone)) {
      e.phone = 'Enter a valid Nepali number (97XXXXXXXX or 98XXXXXXXX)';
    }
    if (!form.password) {
      e.password = 'Password is required';
    } else if (form.password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    }
    if (!form.confirmPassword) {
      e.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3() {
    if (otp.some(d => d === '')) {
      setErrors({ otp: 'Please enter the complete 6-digit OTP' });
      return false;
    }
    return true;
  }

  function goNext() {
    if (step === 1 && validateStep1()) {
      setStep(2);
      showToast('Great! Now fill in your details.', 'success');
    }
    if (step === 2 && validateStep2()) {
      setStep(3);
      showToast(`OTP sent to ${form.phone} 📱`, 'success');
    }
    if (step === 3 && validateStep3()) {
      showToast('Account created successfully! Welcome to Kharcha 🎉', 'success');
    }
  }

  function goBack() {
    setErrors({});
    setStep(s => s - 1);
  }

  const step2Ready =
    (userType === 'personal' ? form.fullName.trim() : form.orgName.trim()) &&
    form.phone.length === 10 &&
    form.password.length >= 8 &&
    form.confirmPassword === form.password;

  const step3Ready = otp.every(d => d !== '');

  const passwordMatch =
    form.password.length >= 8 &&
    form.confirmPassword === form.password &&
    form.confirmPassword !== '';

  return (
    <div className="form-body slide-in">

      <ProgressBar currentStep={step} />

      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* ── STEP 1: Account Type ── */}
      {step === 1 && (
        <div className="slide-in">
          <h2 className="step-title">Create Account</h2>
          <p className="step-subtitle">What type of account do you need?</p>

          <div className="type-cards">
            <button
              className={`type-card ${userType === 'personal' ? 'selected' : ''}`}
              onClick={() => { setUserType('personal'); setErrors({}); }}
            >
              <div className="type-card-icon">👤</div>
              <div className="type-card-text">
                <h4>Personal Account</h4>
                <p>For individuals – send, receive & manage money</p>
              </div>
            </button>
            <button
              className={`type-card ${userType === 'organization' ? 'selected' : ''}`}
              onClick={() => { setUserType('organization'); setErrors({}); }}
            >
              <div className="type-card-icon">🏢</div>
              <div className="type-card-text">
                <h4>Organization Account</h4>
                <p>For businesses – collect payments & manage payroll</p>
              </div>
            </button>
          </div>

          {errors.userType && <span className="error-msg">⚠ {errors.userType}</span>}

          <button className="btn-primary" onClick={goNext} disabled={!userType}>
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: Fill in Details ── */}
      {step === 2 && (
        <div className="slide-in">
          <h2 className="step-title">
            {userType === 'personal' ? 'Your Details' : 'Organization Details'}
          </h2>
          <p className="step-subtitle">Fill in your information to set up the account.</p>

          {userType === 'personal' ? (
            <InputField
              label="Full Name"
              type="text"
              placeholder="e.g. Sita Sharma"
              value={form.fullName}
              onChange={e => updateForm('fullName', e.target.value)}
              icon="user"
              error={errors.fullName}
            />
          ) : (
            <InputField
              label="Organization Name"
              type="text"
              placeholder="e.g. Nepal Exports Pvt. Ltd."
              value={form.orgName}
              onChange={e => updateForm('orgName', e.target.value)}
              icon="building"
              error={errors.orgName}
            />
          )}

          <InputField
            label="Phone Number"
            type="tel"
            placeholder="98XXXXXXXX"
            value={form.phone}
            onChange={e => updateForm('phone', e.target.value)}
            icon="phone"
            error={errors.phone}
            maxLength={10}
          />

          <InputField
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={e => updateForm('password', e.target.value)}
            icon="lock"
            error={errors.password}
          />

          <InputField
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={e => updateForm('confirmPassword', e.target.value)}
            icon="check"
            error={errors.confirmPassword}
            success={passwordMatch ? 'Passwords match!' : ''}
          />

          <button className="btn-primary" onClick={goNext} disabled={!step2Ready}>
            Send OTP →
          </button>
          <button className="btn-secondary" onClick={goBack}>← Back</button>
        </div>
      )}

      {/* ── STEP 3: OTP Verification ── */}
      {step === 3 && (
        <div className="slide-in">
          <h2 className="step-title">Verify Phone</h2>
          <p className="otp-info">
            We sent a 6-digit code to <span className="otp-phone">{form.phone}</span>.
            <br />Enter it below to confirm your account.
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
            <button className="resend-link" onClick={() => showToast('OTP resent to ' + form.phone, 'success')}>
              Resend OTP
            </button>
          </p>

          <button className="btn-primary" onClick={goNext} disabled={!step3Ready}>
            Verify & Create Account
          </button>
          <button className="btn-secondary" onClick={goBack}>← Change Number</button>
        </div>
      )}

    </div>
  );
}

export default SignupForm;
