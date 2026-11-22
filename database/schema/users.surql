-- From https://surrealdb.com/docs/learn/security/authentication/users#define-the-user-table-and-fields
-- Table names are plural per our convention.

DEFINE TABLE users SCHEMAFULL
	PERMISSIONS
		FOR select, update, delete WHERE id = $auth.id;

DEFINE FIELD name ON users TYPE option<string>;
DEFINE FIELD email ON users TYPE string ASSERT string::is_email($value);
DEFINE FIELD password ON users TYPE string;

-- One account per email address (named per our camelCase convention)
DEFINE INDEX uniqueEmail ON users FIELDS email UNIQUE;
