'use strict';

const supabase = require('../services/supabaseClient');

async function uploadDocumentImage(file, accountId, side) {
  const ext = file.originalname.split('.').pop().toLowerCase() || 'jpg';
  const path = `${accountId}/${side}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('kyc-documents')
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

async function getKycStatus(req, res) {
  try {
    const accountId = req.account.account_id;

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('kyc_status')
      .eq('account_id', accountId)
      .single();

    if (accountError) throw accountError;

    const { data: submission } = await supabase
      .from('kyc_submissions')
      .select('id, status, rejection_reason, submitted_at, reviewed_at')
      .eq('account_id', accountId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    return res.json({
      kyc_status: account.kyc_status,
      submission: submission || null,
    });
  } catch (err) {
    console.error('getKycStatus error:', err);
    return res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
}

async function submitKyc(req, res) {
  try {
    const accountId = req.account.account_id;
    const { full_name, dob, address, grandfathers_name, nid_number } = req.body;

    if (!full_name || !dob || !address || !grandfathers_name || !nid_number) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!req.files?.doc_front?.[0]) {
      return res.status(400).json({ error: 'NID front image is required' });
    }
    if (!req.files?.doc_back?.[0]) {
      return res.status(400).json({ error: 'NID back image is required' });
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('kyc_status')
      .eq('account_id', accountId)
      .single();

    if (accountError) throw accountError;

    if (account.kyc_status === 'verified') {
      return res.status(409).json({ error: 'Your KYC is already verified' });
    }
    if (account.kyc_status === 'pending') {
      return res.status(409).json({ error: 'You already have a KYC submission under review' });
    }

    const docFrontUrl = await uploadDocumentImage(req.files.doc_front[0], accountId, 'front');
    const docBackUrl  = await uploadDocumentImage(req.files.doc_back[0],  accountId, 'back');

    const { data: submission, error: insertError } = await supabase
      .from('kyc_submissions')
      .insert({
        account_id:        accountId,
        full_name:         full_name.trim(),
        dob,
        address:           address.trim(),
        grandfathers_name: grandfathers_name.trim(),
        nid_number:        nid_number.trim(),
        doc_front_url:     docFrontUrl,
        doc_back_url:      docBackUrl,
        status:            'pending',
      })
      .select('id, status, submitted_at')
      .single();

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ kyc_status: 'pending' })
      .eq('account_id', accountId);

    if (updateError) throw updateError;

    return res.status(201).json({
      message: 'KYC submitted successfully. We will review it within 1–2 business days.',
      submission,
    });
  } catch (err) {
    console.error('submitKyc error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already have an active KYC submission' });
    }
    return res.status(500).json({ error: 'Failed to submit KYC' });
  }
}

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
        `id, status, full_name, nid_number, submitted_at, reviewed_at, rejection_reason,
         accounts!kyc_submissions_account_id_fkey (account_id, email, phone_number)`,
        { count: 'exact' }
      )
      .eq('status', status)
      .order('submitted_at', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    return res.json({
      submissions: data,
      pagination: {
        page:  parseInt(page),
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

async function adminGetSubmission(req, res) {
  try {
    const { submission_id } = req.params;

    const { data: submission, error } = await supabase
      .from('kyc_submissions')
      .select(
        `*, accounts!kyc_submissions_account_id_fkey (account_id, email, phone_number)`
      )
      .eq('id', submission_id)
      .single();

    if (error || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const signedUrls = {};
    if (submission.doc_front_url) {
      const { data: frontSigned } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(submission.doc_front_url, 300);
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

async function adminApproveSubmission(req, res) {
  try {
    const { submission_id } = req.params;
    const adminId = req.account.account_id;

    const { data: submission, error: fetchError } = await supabase
      .from('kyc_submissions')
      .select('id, account_id, status')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (submission.status !== 'pending') {
      return res.status(409).json({ error: `Submission is already ${submission.status}` });
    }

    const { error: subError } = await supabase
      .from('kyc_submissions')
      .update({
        status:      'verified',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission_id);

    if (subError) throw subError;

    const { error: accountError } = await supabase
      .from('accounts')
      .update({ kyc_status: 'verified' })
      .eq('account_id', submission.account_id);

    if (accountError) throw accountError;

    return res.json({ message: 'KYC submission approved' });
  } catch (err) {
    console.error('adminApproveSubmission error:', err);
    return res.status(500).json({ error: 'Failed to approve submission' });
  }
}

async function adminRejectSubmission(req, res) {
  try {
    const { submission_id } = req.params;
    const adminId = req.account.account_id;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A rejection reason of at least 5 characters is required' });
    }

    const { data: submission, error: fetchError } = await supabase
      .from('kyc_submissions')
      .select('id, account_id, status')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (submission.status !== 'pending') {
      return res.status(409).json({ error: `Submission is already ${submission.status}` });
    }

    const { error: subError } = await supabase
      .from('kyc_submissions')
      .update({
        status:           'rejected',
        rejection_reason: reason.trim(),
        reviewed_by:      adminId,
        reviewed_at:      new Date().toISOString(),
      })
      .eq('id', submission_id);

    if (subError) throw subError;

    const { error: accountError } = await supabase
      .from('accounts')
      .update({ kyc_status: 'rejected' })
      .eq('account_id', submission.account_id);

    if (accountError) throw accountError;

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