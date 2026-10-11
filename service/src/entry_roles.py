ENTRY_ROLES = frozenset({
    'visitor', 'referenced', 'consulted', 'support_person', 'participant', 'other',
})


def valid_entry_role(value):
    return isinstance(value, str) and value in ENTRY_ROLES
