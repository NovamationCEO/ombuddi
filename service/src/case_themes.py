"""Plain-text case snapshots with reusable, independently editable suggestions."""


def normalize_themes(value):
    if not isinstance(value, list) or len(value) > 50:
        raise ValueError('themes must be a list of at most 50 names')
    result, seen = [], set()
    for item in value:
        if not isinstance(item, str):
            raise ValueError('Each theme must be text')
        name = ' '.join(item.split())
        if not name or len(name) > 120:
            raise ValueError('Each theme must contain between 1 and 120 characters')
        if name.casefold() not in seen:
            result.append(name)
            seen.add(name.casefold())
    return result


def record_theme_suggestions(cur, organization_id, themes, previous=()):
    # Retained case values must not re-add suggestions that an office deleted.
    retained = {name.casefold(): name for name in previous}
    result = []
    for name in themes:
        if name.casefold() in retained:
            result.append(retained[name.casefold()])
            continue
        cur.execute("""
            INSERT INTO picklists (organization_id, kind, name, description, index)
            VALUES (%s, 'case_theme', %s, '', (
                SELECT COALESCE(MAX(index), -1) + 1 FROM picklists
                WHERE organization_id = %s AND kind = 'case_theme'
            ))
            ON CONFLICT (organization_id, lower(btrim(name)))
                WHERE kind = 'case_theme' AND soft_delete = FALSE
            DO UPDATE SET name = picklists.name
            RETURNING name
        """, (organization_id, name, organization_id))
        result.append(cur.fetchone()[0])
    return result
