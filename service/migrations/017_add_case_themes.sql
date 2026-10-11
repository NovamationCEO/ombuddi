BEGIN;
ALTER TABLE cases ADD COLUMN themes TEXT[] NOT NULL DEFAULT '{}';
-- Names are snapshots on cases; suggestions may be retired independently.
CREATE UNIQUE INDEX picklists_case_theme_name_unique
    ON picklists (organization_id, lower(btrim(name)))
    WHERE kind = 'case_theme' AND soft_delete = FALSE;

CREATE FUNCTION seed_default_case_themes(target_org UUID)
RETURNS void LANGUAGE sql AS $$
    INSERT INTO picklists (organization_id, kind, name, description, index)
    SELECT target_org, 'case_theme', defaults.name, '', defaults.position
    FROM (VALUES
        ('Advising Issues', 0),
        ('Staff/Faculty Conflict', 1),
        ('Staff/Administration Conflict', 2),
        ('Student/Faculty Conflict', 3),
        ('Supervising Conflict', 4),
        ('Title IX', 5),
        ('Equity Issues', 6),
        ('Job Insecurity', 7)
    ) AS defaults(name, position)
    WHERE NOT EXISTS (
        SELECT 1 FROM picklists WHERE organization_id = target_org AND kind = 'case_theme'
    );
$$;

CREATE FUNCTION seed_organization_case_themes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM seed_default_case_themes(NEW.id);
    RETURN NEW;
END;
$$;
CREATE TRIGGER organizations_seed_case_themes
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION seed_organization_case_themes();

SELECT seed_default_case_themes(id) FROM organizations;
COMMIT;
