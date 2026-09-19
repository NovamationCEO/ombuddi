"""Structured facts allowed in email audit records and history responses."""
EMAIL_DELIVERY_FIELDS = frozenset({
    'sender', 'status', 'reason', 'stage', 'httpStatus', 'submissionAttempts',
})
