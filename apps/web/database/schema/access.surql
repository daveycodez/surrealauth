-- From https://surrealdb.com/docs/reference/query-language/statements/define/access/record#example-usage
-- Kept our `password` field name instead of the docs' `pass`, and our plural `users` table.
-- The JWT key is fixed via the JWT_SECRET template variable (SURREALKIT_VAR_JWT_SECRET in .env)
-- so re-applying this file doesn't rotate the key and sign everyone out.

DEFINE ACCESS account ON DATABASE TYPE RECORD
	SIGNUP ( CREATE users SET email = $email, password = crypto::argon2::generate($pass) )
	SIGNIN ( SELECT * FROM users WHERE email = $email
	  AND crypto::argon2::compare(password, $pass) )
	WITH JWT ALGORITHM HS512 KEY '${JWT_SECRET}'
	DURATION FOR TOKEN 15m, FOR SESSION 12h
;
