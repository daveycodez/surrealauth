-- From https://surrealdb.com/docs/learn/security/authentication/users#define-the-user-table-and-fields
-- Table names are singular camelCase per our convention (matches SurrealKit type names).

DEFINE TABLE user SCHEMAFULL
	PERMISSIONS
		FOR select, update, delete WHERE id = $auth.id;

DEFINE FIELD name ON user TYPE option<string>;
DEFINE FIELD email ON user TYPE string ASSERT string::is_email($value);
-- Never sent to clients (from https://github.com/surrealdb/examples/blob/main/notes-kit/src/schema/user.surql).
DEFINE FIELD password ON user TYPE string PERMISSIONS FOR select NONE;

-- One account per email address (named per our camelCase convention)
DEFINE INDEX uniqueEmail ON user FIELDS email UNIQUE;
