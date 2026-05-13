
'use strict';

const supabase = require('../services/supabaseClient');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Upload a base64 or Buffer image to Supabase Storage (kyc-documents bucket).
 * Expects req.files to be populated by a multipart middleware (e.g. multer memoryStorage).
 */
async function uploadDocumentImage(file, userId, side) {
  // file = { buffer: Buffer, mimetype: string, originalname: string }
  const ext = file.originalname.split('.').pop().toLowerCase() || 'jpg';
  const path = `${userId}/${side}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('kyc-documents')
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path; // store the path, not a public URL (bucket is private)
}

// ─── User-facing controllers ─────────────────────────────────────────────────

/**
 * GET /api/kyc/status
 * Returns the user's current KYC status and their latest submission (if any).
 */
async function getKycStatus(req, res) {
  try {
    const userId = req.user.id;

    // Fetch KYC status from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Fetch latest submission for display (rejection reason etc.)
    const { data: submission } = await supabase
      .from('kyc_submissions')
      .select('id, status, document_type, rejection_reason, submitted_at, reviewed_at')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    return res.json({
      kyc_status: user.kyc_status,
      submission: submission || null,
    });
  } catch (err) {
    console.error('getKycStatus error:', err);
    return res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
}

/**
 * POST /api/kyc/submit
 * Multipart form. Fields: full_name, date_of_birth, address, document_type, document_number
 * Files: doc_front (required), doc_back (optional — not required for passport)
 */
async function submitKyc(req, res) {
  try {
    const userId = req.user.id;
    const { full_name, date_of_birth, address, document_type, document_number } = req.body;

    // ── Validation ──────────────────────────────────────────
    const allowedDocTypes = ['citizenship', 'passport', 'national_id'];
    if (!full_name || !date_of_birth || !address || !document_type || !document_number) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!allowedDocTypes.includes(document_type)) {
      return res.status(400).json({
        error: `document_type must be one of: ${allowedDocTypes.join(', ')}`,
      });
    }
    if (!req.files?.doc_front?.[0]) {
      return res.status(400).json({ error: 'Front document image is required' });
    }
    if (document_type !== 'passport' && !req.files?.doc_back?.[0]) {
      return res.status(400).json({
        error: 'Back document image is required for this document type',
      });
    }

    // ── Check current KYC status ────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    if (user.kyc_status === 'verified') {
      return res.status(409).json({ error: 'Your KYC is already verified' });
    }
    if (user.kyc_status === 'pending') {
      return res.status(409).json({
        error: 'You already have a KYC submission under review',
      });
    }

    // ── Upload images ───────────────────────────────────────
    const docFrontUrl = await uploadDocumentImage(req.files.doc_front[0], userId, 'front');
    let docBackUrl = null;
    if (req.files?.doc_back?.[0]) {
      docBackUrl = await uploadDocumentImage(req.files.doc_back[0], userId, 'back');
    }

    // ── Insert submission ───────────────────────────────────
    const { data: submission, error: insertError } = await supabase
      .from('kyc_submissions')
      .insert({
        user_id: userId,
        full_name: full_name.trim(),
        date_of_birth,
        address: address.trim(),
        document_type,
        document_number: document_number.trim(),
        doc_front_url: docFrontUrl,
        doc_back_url: docBackUrl,
        status: 'pending',
      })
      .select('id, status, submitted_at')
      .single();

    if (insertError) throw insertError;

    // ── Update user kyc_status → pending ────────────────────
    const { error: updateError } = await supabase
      .from('users')
      .update({ kyc_status: 'pending' })
      .eq('id', userId);

    if (updateError) throw updateError;

    return res.status(201).json({
      message: 'KYC submitted successfully. We will review it within 1–2 business days.',
      submission,
    });
  } catch (err) {
    console.error('submitKyc error:', err);
    // Handle unique constraint (active submission already exists)
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'You already have an active KYC submission',
      });
    }
    return res.status(500).json({ error: 'Failed to submit KYC' });
  }
}

// ─── Admin controllers ────────────────────────────────────────────────────────

/**
 * GET /api/kyc/admin/submissions
 * Lists KYC submissions. Query params: status (pending/verified/rejected), page, limit
 */
async function adminListSubmissions(req, res) {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const allowedStatuses = ['pending', 'verified', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const { data, error, count } = await supabase
      .from('kyc_submissions')
      .select(
        `id, status, document_type, document_number, full_name,
         submitted_at, reviewed_at, rejection_reason,
         users!kyc_submissions_user_id_fkey (id, email, phone_number, username)`,
        { count: 'exact' }
      )
      .eq('status', status)
      .order('submitted_at', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    return res.json({
      submissions: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('adminListSubmissions error:', err);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

/**
 * GET /api/kyc/admin/submissions/:submission_id
 * Full detail for a single submission, including signed document URLs.
 */
async function adminGetSubmission(req, res) {
  try {
    const { submission_id } = req.params;

    const { data: submission, error } = await supabase
      .from('kyc_submissions')
      .select(
        `*, users!kyc_submissions_user_id_fkey (id, email, phone_number, username, full_name)`
      )
      .eq('id', submission_id)
      .single();

    if (error || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Generate short-lived signed URLs so admin can view the images
    const signedUrls = {};
    if (submission.doc_front_url) {
      const { data: frontSigned } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(submission.doc_front_url, 300); // 5 min TTL
      signedUrls.doc_front = frontSigned?.signedUrl || null;
    }
    if (submission.doc_back_url) {
      const { data: backSigned } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(submission.doc_back_url, 300);
      signedUrls.doc_back = backSigned?.signedUrl || null;
    }

    return res.json({ ...submission, signed_urls: signedUrls });
  } catch (err) {
    console.error('adminGetSubmission error:', err);
    return res.status(500).json({ error: 'Failed to fetch submission' });
  }
}

/**
 * POST /api/kyc/admin/submissions/:submission_id/approve
 * Approves a pending submission and marks the user as verified.
 */
async function adminApproveSubmission(req, res) {
  try {
    const { submission_id } = req.params;
    const adminId = req.user.id;

    // Fetch submission
    const { data: submission, error: fetchError } = await supabase
      .from('kyc_submissions')
      .select('id, user_id, status')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (submission.status !== 'pending') {
      return res.status(409).json({
        error: `Submission is already ${submission.status}`,
      });
    }

    // Update submission
    const { error: subError } = await supabase
      .from('kyc_submissions')
      .update({
        status: 'verified',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission_id);

    if (subError) throw subError;

    // Update user kyc_status
    const { error: userError } = await supabase
      .from('users')
      .update({ kyc_status: 'verified' })
      .eq('id', submission.user_id);

    if (userError) throw userError;

    return res.json({ message: 'KYC submission approved' });
  } catch (err) {
    console.error('adminApproveSubmission error:', err);
    return res.status(500).json({ error: 'Failed to approve submission' });
  }
}

/**
 * POST /api/kyc/admin/submissions/:submission_id/reject
 * Body: { reason: string }
 * Rejects a pending submission and allows the user to resubmit.
 */
async function adminRejectSubmission(req, res) {
  try {
    const { submission_id } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        error: 'A rejection reason of at least 5 characters is required',
      });
    }

    const { data: submission, error: fetchError } = await supabase
      .from('kyc_submissions')
      .select('id, user_id, status')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (submission.status !== 'pending') {
      return res.status(409).json({
        error: `Submission is already ${submission.status}`,
      });
    }

    // Update submission
    const { error: subError } = await supabase
      .from('kyc_submissions')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission_id);

    if (subError) throw subError;

    // Update user kyc_status → rejected (allows resubmission)
    const { error: userError } = await supabase
      .from('users')
      .update({ kyc_status: 'rejected' })
      .eq('id', submission.user_id);

    if (userError) throw userError;

    return res.json({ message: 'KYC submission rejected' });
  } catch (err) {
    console.error('adminRejectSubmission error:', err);
    return res.status(500).json({ error: 'Failed to reject submission' });
  }
}

module.exports = {
  getKycStatus,
  submitKyc,
  adminListSubmissions,
  adminGetSubmission,
  adminApproveSubmission,
  adminRejectSubmission,
};