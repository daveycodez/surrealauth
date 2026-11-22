-- From https://surrealdb.com/docs/learn/security/authentication/users#define-the-user-table-and-fields

DEFINE TABLE user SCHEMAFULL
	PERMISSIONS
		FOR select, update, delete WHERE id = $auth.id;

DEFINE FIELD name ON user TYPE option<string>;
DEFINE FIELD email ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD password ON user TYPE string;

-- One account per email address (named per our camelCase convention)
DEFINE INDEX uniqueEmail ON user FIELDS email UNIQUE;
