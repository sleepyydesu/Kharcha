
'use strict';

const supabase = require('../services/supabaseClient');

/**
 * requireKYC
 *
 * Middleware that blocks the request with 403 if the authenticated user's
 * KYC status is not 'verified'. Place AFTER the authenticate middleware.
 *
 * Usage in routes:
 *   const { authenticate } = require('../middleware/authmiddleware');
 *   const { requireKYC } = require('../middleware/kycMiddleware');
 *
 *   router.post('/transfer', authenticate, requireKYC, transferHandler);
 */
async function requireKYC(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // Should never reach here if authenticate ran first, but guard anyway
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (user.kyc_status === 'verified') {
      return next();
    }

    // Return a structured error the frontend can act on
    const messages = {
      unverified: 'KYC verification is required to use this feature. Please complete your KYC.',
      pending:    'Your KYC is currently under review. This feature will be unlocked once approved.',
      rejected:   'Your KYC was rejected. Please resubmit with valid documents to use this feature.',
    };

    return res.status(403).json({
      error: 'KYC_REQUIRED',
      kyc_status: user.kyc_status,
      message: messages[user.kyc_status] || 'KYC verification required.',
    });
  } catch (err) {
    console.error('requireKYC error:', err);
    return res.status(500).json({ error: 'Failed to verify KYC status' });
  }
}

module.exports = { requireKYC };