ALTER TABLE core.branch
    ADD CONSTRAINT branch_name_unique UNIQUE (name);
