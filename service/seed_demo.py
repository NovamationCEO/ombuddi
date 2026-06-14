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
    {
        'id':              'dd000000-0000-0000-0000-000000000002',
        'name':            'Alex Rivera',       # grad student, Case 1 primary visitor
        'gender':          'Male',
        'generation':      'Millennial',
        'race':            'Hispanic of any Race',
        'primary_role':    'grad',
        'is_international': 'FALSE',
    },
    {
        'id':              'dd000000-0000-0000-0000-000000000003',
        'name':            'Jordan Kim',        # undergrad, Case 2 primary visitor
        'gender':          'Non-Binary',
        'generation':      'Gen Z',
        'race':            'Asian',
        'primary_role':    'undergrad',
        'is_international': 'FALSE',
    },
    {
        'id':              'dd000000-0000-0000-0000-000000000004',
        'name':            'Sam Okafor',        # exempt staff, Case 1 consultation
        'gender':          'Male',
        'generation':      'Gen X',
        'race':            'Black / African American / Afro-Caribbean',
        'primary_role':    'exempt',
        'is_international': 'FALSE',
    },
    {
        'id':              'dd000000-0000-0000-0000-000000000005',
        'name':            'Casey Williams',    # non-exempt staff, Case 2 consultation
        'gender':          'Female',
        'generation':      'Boomer',
        'race':            'White',
        'primary_role':    'nonexempt',
        'is_international': 'FALSE',
    },
]

# ── entry_person links for private persons ────────────────────────────────────
ENTRY_PERSON_LINKS = [
    # Case 1: Alex Rivera appears in entries 1, 2, and 4
    ('dd000000-0000-0000-0000-000000000011', 'dd000000-0000-0000-0000-000000000002'),
    ('dd000000-0000-0000-0000-000000000012', 'dd000000-0000-0000-0000-000000000002'),
    ('dd000000-0000-0000-0000-000000000014', 'dd000000-0000-0000-0000-000000000002'),
    # Case 1: Sam Okafor in entry 3 (staff consultation)
    ('dd000000-0000-0000-0000-000000000013', 'dd000000-0000-0000-0000-000000000004'),
    # Case 2: Jordan Kim appears in entries 1 and 2
    ('dd000000-0000-0000-0000-000000000021', 'dd000000-0000-0000-0000-000000000003'),
    ('dd000000-0000-0000-0000-000000000022', 'dd000000-0000-0000-0000-000000000003'),
    # Case 2: Casey Williams in entry 3 (staff consultation)
    ('dd000000-0000-0000-0000-000000000023', 'dd000000-0000-0000-0000-000000000005'),
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
