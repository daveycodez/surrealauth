DEFINE TABLE todo SCHEMAFULL
	PERMISSIONS
		FOR select, update, delete WHERE userId = $auth.id
		FOR create WHERE userId = $auth.id;

DEFINE FIELD text ON todo TYPE string;
DEFINE FIELD completed ON todo TYPE bool DEFAULT false;
DEFINE FIELD userId ON todo TYPE record<user> DEFAULT $auth.id READONLY;
DEFINE FIELD createdAt ON todo TYPE datetime DEFAULT time::now() READONLY;
DEFINE FIELD updatedAt ON todo TYPE datetime VALUE time::now();

DEFINE INDEX todoUserId ON todo FIELDS userId;
