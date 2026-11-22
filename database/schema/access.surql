-- From https://surrealdb.com/docs/learn/security/authentication/users#define-the-user-record-access

DEFINE ACCESS user ON DATABASE TYPE RECORD
	SIGNIN (
		SELECT * FROM user WHERE email = $email
		  AND crypto::argon2::compare(password, $password)
	)
	SIGNUP (
		CREATE user CONTENT {
			name: $name,
			email: $email,
			password: crypto::argon2::generate($password)
		}
	);
