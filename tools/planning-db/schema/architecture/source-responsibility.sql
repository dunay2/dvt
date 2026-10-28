-- Current semantic associations. Git remains the physical inventory authority.
CREATE TABLE architecture.component_source_responsibility (
    component_id text NOT NULL REFERENCES architecture.component(component_id),
    responsibility_id text NOT NULL REFERENCES architecture.component_responsibility(responsibility_id),
    source_path text NOT NULL CHECK (btrim(source_path) <> ''),
    qualified_symbol text NOT NULL CHECK (btrim(qualified_symbol) <> ''),
    role text NOT NULL CHECK (role IN ('implements', 'delegates', 'verifies')),
    test_paths text[] NOT NULL CHECK (cardinality(test_paths) > 0 AND array_position(test_paths, NULL) IS NULL),
    PRIMARY KEY (responsibility_id, source_path, qualified_symbol)
);

-- End of Planning DB current declarative schema.
