"""
Demo seed — private persons.

Computes the two-layer name hash for each private visitor and prints SQL
that can be piped directly into psql. Uses only stdlib; no psycopg2 needed.

Run from service/ AFTER seed_demo.sql (NAME_SALT must be in the environment):
    python seed_demo.py | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"

NAME_SALT is loaded automatically from .env if present; it is also available
in the shell if you ran `set -a; source .env; set +a` beforehand.
"""

import hashlib
import os
import unicodedata

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # fine — NAME_SALT may already be in the environment

NAME_SALT = os.environ.get('NAME_SALT', 'fallback-salt')
ORG_ID    = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
DEMO_SALT = 'demo'


# ── Hashing (mirrors useHashName.ts + hash_name.py) ──────────────────────────
def full_hash(name: str) -> str:
    raw = unicodedata.normalize('NFC', (name + DEMO_SALT + ORG_ID).strip().lower())
    client = hashlib.sha256(raw.encode()).hexdigest()
    return hashlib.sha256((client + NAME_SALT).encode()).hexdigest()


# ── Demo personas ─────────────────────────────────────────────────────────────
PERSONS = [
    # ── Cases 1 & 3 & 10 ─────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000002',
        'name':             'Alex Rivera',       # grad / Millennial / Hispanic / Male
        'gender':           'Male',
        'generation':       'Millennial',
        'race':             'Hispanic of any Race',
        'primary_role':     'grad',
        'is_international': 'FALSE',
    },
    # ── Cases 2 & 4 & 9 ──────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000003',
        'name':             'Jordan Kim',        # undergrad / Gen Z / Asian / Non-Binary
        'gender':           'Non-Binary',
        'generation':       'Gen Z',
        'race':             'Asian',
        'primary_role':     'undergrad',
        'is_international': 'FALSE',
    },
    # ── Cases 1 & 6 ──────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000004',
        'name':             'Sam Okafor',        # exempt / Gen X / Black / Male
        'gender':           'Male',
        'generation':       'Gen X',
        'race':             'Black / African American / Afro-Caribbean',
        'primary_role':     'exempt',
        'is_international': 'FALSE',
    },
    # ── Case 2 ────────────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000005',
        'name':             'Casey Williams',    # nonexempt / Boomer / White / Female
        'gender':           'Female',
        'generation':       'Boomer',
        'race':             'White',
        'primary_role':     'nonexempt',
        'is_international': 'FALSE',
    },
    # ── Case 3 ────────────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000006',
        'name':             'Morgan Chen',       # exempt / Gen X / Asian / Female / international
        'gender':           'Female',
        'generation':       'Gen X',
        'race':             'Asian',
        'primary_role':     'exempt',
        'is_international': 'TRUE',
    },
    # ── Cases 4 ───────────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000007',
        'name':             'Jamie Osei',        # nonexempt / Millennial / Black / Male
        'gender':           'Male',
        'generation':       'Millennial',
        'race':             'Black / African American / Afro-Caribbean',
        'primary_role':     'nonexempt',
        'is_international': 'FALSE',
    },
    # ── Cases 5 & 7 ──────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000008',
        'name':             'Riley Patel',       # grad / Gen Z / Asian / Female
        'gender':           'Female',
        'generation':       'Gen Z',
        'race':             'Asian',
        'primary_role':     'grad',
        'is_international': 'FALSE',
    },
    # ── Cases 6 & 8 ──────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000009',
        'name':             'Marcus Johnson',    # exempt / Gen X / Black / Male
        'gender':           'Male',
        'generation':       'Gen X',
        'race':             'Black / African American / Afro-Caribbean',
        'primary_role':     'exempt',
        'is_international': 'FALSE',
    },
    # ── Cases 7 & 9 ──────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000010',
        'name':             'Sofia Hernandez',   # undergrad / Gen Z / Hispanic / Female
        'gender':           'Female',
        'generation':       'Gen Z',
        'race':             'Hispanic of any Race',
        'primary_role':     'undergrad',
        'is_international': 'FALSE',
    },
    # ── Cases 5 & 8 ──────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000011',
        'name':             'David Lee',         # exempt / Millennial / Asian / Male
        'gender':           'Male',
        'generation':       'Millennial',
        'race':             'Asian',
        'primary_role':     'exempt',
        'is_international': 'FALSE',
    },
    # ── Cases 6 & 9 ──────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000012',
        'name':             'Priya Sharma',      # grad / Gen Z / Asian / Female / international
        'gender':           'Female',
        'generation':       'Gen Z',
        'race':             'Asian',
        'primary_role':     'grad',
        'is_international': 'TRUE',
    },
    # ── Cases 8 & 10 ─────────────────────────────────────────────────────────
    {
        'id':               'dd000000-0000-0000-0000-000000000013',
        'name':             'Tom Mitchell',      # nonexempt / Boomer / White / Male
        'gender':           'Male',
        'generation':       'Boomer',
        'race':             'White',
        'primary_role':     'nonexempt',
        'is_international': 'FALSE',
    },
]

# ── entry_person links for private persons ────────────────────────────────────
ENTRY_PERSON_LINKS = [
    # Case 1: Alex Rivera in entries 1, 2, 4 (primary); Sam Okafor in entry 3 (consultation)
    ('dd000000-0000-0000-0000-000000000011', 'dd000000-0000-0000-0000-000000000002'),
    ('dd000000-0000-0000-0000-000000000012', 'dd000000-0000-0000-0000-000000000002'),
    ('dd000000-0000-0000-0000-000000000013', 'dd000000-0000-0000-0000-000000000004'),
    ('dd000000-0000-0000-0000-000000000014', 'dd000000-0000-0000-0000-000000000002'),

    # Case 2: Jordan Kim in entries 1, 2 (primary); Casey Williams in entry 3 (consultation)
    ('dd000000-0000-0000-0000-000000000021', 'dd000000-0000-0000-0000-000000000003'),
    ('dd000000-0000-0000-0000-000000000022', 'dd000000-0000-0000-0000-000000000003'),
    ('dd000000-0000-0000-0000-000000000023', 'dd000000-0000-0000-0000-000000000005'),

    # Case 3: Morgan Chen in entries 1, 3 (primary); Alex Rivera in entry 2 (witness)
    ('dd000000-0000-0000-0000-000000000031', 'dd000000-0000-0000-0000-000000000006'),
    ('dd000000-0000-0000-0000-000000000032', 'dd000000-0000-0000-0000-000000000002'),
    ('dd000000-0000-0000-0000-000000000033', 'dd000000-0000-0000-0000-000000000006'),

    # Case 4: Jamie Osei in entries 1, 3 (primary); Jordan Kim in entry 2 (separately affected)
    ('dd000000-0000-0000-0000-000000000041', 'dd000000-0000-0000-0000-000000000007'),
    ('dd000000-0000-0000-0000-000000000042', 'dd000000-0000-0000-0000-000000000003'),
    ('dd000000-0000-0000-0000-000000000043', 'dd000000-0000-0000-0000-000000000007'),

    # Case 5: Riley Patel in entries 1, 3, 4, 5 (primary); David Lee in entry 2 (consultation)
    ('dd000000-0000-0000-0000-000000000051', 'dd000000-0000-0000-0000-000000000008'),
    ('dd000000-0000-0000-0000-000000000052', 'dd000000-0000-0000-0000-000000000011'),
    ('dd000000-0000-0000-0000-000000000053', 'dd000000-0000-0000-0000-000000000008'),
    ('dd000000-0000-0000-0000-000000000054', 'dd000000-0000-0000-0000-000000000008'),
    ('dd000000-0000-0000-0000-000000000055', 'dd000000-0000-0000-0000-000000000008'),

    # Case 6: Marcus Johnson in entries 1, 3, 4 (primary); Priya Sharma in entry 2 (witness);
    #         Sam Okafor also in entry 4 (joint session — shared from Case 1)
    ('dd000000-0000-0000-0000-000000000061', 'dd000000-0000-0000-0000-000000000009'),
    ('dd000000-0000-0000-0000-000000000062', 'dd000000-0000-0000-0000-000000000012'),
    ('dd000000-0000-0000-0000-000000000063', 'dd000000-0000-0000-0000-000000000009'),
    ('dd000000-0000-0000-0000-000000000064', 'dd000000-0000-0000-0000-000000000009'),
    ('dd000000-0000-0000-0000-000000000064', 'dd000000-0000-0000-0000-000000000004'),

    # Case 7: Sofia Hernandez in entries 1, 2, 4 (primary); Riley Patel in entry 3 (TA witness)
    ('dd000000-0000-0000-0000-000000000071', 'dd000000-0000-0000-0000-000000000010'),
    ('dd000000-0000-0000-0000-000000000072', 'dd000000-0000-0000-0000-000000000010'),
    ('dd000000-0000-0000-0000-000000000073', 'dd000000-0000-0000-0000-000000000008'),
    ('dd000000-0000-0000-0000-000000000074', 'dd000000-0000-0000-0000-000000000010'),

    # Case 8: Marcus Johnson in entry 1 (primary); David Lee in entry 2; Tom Mitchell in entry 3
    ('dd000000-0000-0000-0000-000000000081', 'dd000000-0000-0000-0000-000000000009'),
    ('dd000000-0000-0000-0000-000000000082', 'dd000000-0000-0000-0000-000000000011'),
    ('dd000000-0000-0000-0000-000000000083', 'dd000000-0000-0000-0000-000000000013'),
    # entry 84 is a solo documentation note — no person link

    # Case 9: Priya Sharma in entries 1, 2, 4, 5 (primary);
    #         Sofia Hernandez in entry 3 (peer consultation — shared from Case 7);
    #         Jordan Kim in entry 5 (separately seeking support — shared from Case 2)
    ('dd000000-0000-0000-0000-000000000091', 'dd000000-0000-0000-0000-000000000012'),
    ('dd000000-0000-0000-0000-000000000092', 'dd000000-0000-0000-0000-000000000012'),
    ('dd000000-0000-0000-0000-000000000093', 'dd000000-0000-0000-0000-000000000010'),
    ('dd000000-0000-0000-0000-000000000094', 'dd000000-0000-0000-0000-000000000012'),
    ('dd000000-0000-0000-0000-000000000095', 'dd000000-0000-0000-0000-000000000003'),

    # Case 10: Tom Mitchell in entries 1, 2, 3, 4 (primary);
    #          Alex Rivera in entry 3 (witness — shared from Cases 1 & 3)
    ('dd000000-0000-0000-0000-0000000000a1', 'dd000000-0000-0000-0000-000000000013'),
    ('dd000000-0000-0000-0000-0000000000a2', 'dd000000-0000-0000-0000-000000000013'),
    ('dd000000-0000-0000-0000-0000000000a3', 'dd000000-0000-0000-0000-000000000013'),
    ('dd000000-0000-0000-0000-0000000000a3', 'dd000000-0000-0000-0000-000000000002'),
    ('dd000000-0000-0000-0000-0000000000a4', 'dd000000-0000-0000-0000-000000000013'),
]


# ── Emit SQL ──────────────────────────────────────────────────────────────────
def q(s: str) -> str:
    """Escape a string for a SQL literal."""
    return s.replace("'", "''")

def main():
    lines = []
    for p in PERSONS:
        hashed = full_hash(p['name'])
        lines.append(
            f"INSERT INTO persons "
            f"(id, hashed_name, is_public, gender, generation, race, primary_role, is_international, organization_id) "
            f"VALUES ("
            f"'{p['id']}', '{hashed}', FALSE, "
            f"'{q(p['gender'])}', '{q(p['generation'])}', '{q(p['race'])}', "
            f"'{q(p['primary_role'])}', {p['is_international']}, '{ORG_ID}'"
            f") ON CONFLICT (id) DO NOTHING;"
        )

    for entry_id, person_id in ENTRY_PERSON_LINKS:
        lines.append(
            f"INSERT INTO entry_person (entry_id, person_id) "
            f"VALUES ('{entry_id}', '{person_id}') "
            f"ON CONFLICT DO NOTHING;"
        )

    print('\n'.join(lines))


if __name__ == '__main__':
    main()
