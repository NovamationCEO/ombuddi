def normalize_email(value) -> str | None:
    """Normalize an email for invitation identity comparisons.

    Auth0's Post-Login Action applies the same trim/lowercase normalization.
    This intentionally performs conservative structural validation without
    trying to implement the full email-address RFC grammar.
    """
    if not isinstance(value, str):
        return None

    normalized = value.strip().lower()
    if not normalized or len(normalized) > 254 or normalized.count('@') != 1:
        return None
    if any(character.isspace() or ord(character) < 32 for character in normalized):
        return None

    local_part, domain = normalized.split('@', 1)
    if not local_part or not domain or domain.startswith('.') or domain.endswith('.'):
        return None
    return normalized
