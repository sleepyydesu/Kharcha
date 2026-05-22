'use strict';

const supabase = require('../services/supabaseClient');

async function requireKYC(req, res, next) {
  try {
    const userId = req.account?.account_id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { data: user, error } = await supabase
      .from('accounts')
      .select('kyc_status')
      .eq('account_id', userId)
      .single();

    if (error) throw error;

    if (user.kyc_status === 'verified') {
      return next();
    }

    const messages = {
      unverified:
        'KYC verification is required to use this feature. Please complete your KYC.',
      pending:
        'Your KYC is currently under review. This feature will be unlocked once approved.',
      rejected:
        'Your KYC was rejected. Please resubmit with valid documents to use this feature.',
    };

    return res.status(403).json({
      error: 'KYC_REQUIRED',
      kyc_status: user.kyc_status,
      message:
        messages[user.kyc_status] ||
        'KYC verification required.',
    });

  } catch (err) {
    console.error('requireKYC error:', err);

    return res.status(500).json({
      error: 'Failed to verify KYC status',
    });
  }
}

module.exports = { requireKYC };