-- From https://surrealdb.com/docs/reference/query-language/statements/define/access/record#example-usage
-- Kept our `password` field name instead of the docs' `pass`.
-- The JWT key is fixed via the JWT_SECRET template variable (SURREALKIT_VAR_JWT_SECRET in .env)
-- so re-applying this file doesn't rotate the key and sign everyone out.
-- WITH REFRESH (https://surrealdb.com/docs/reference/query-language/statements/define/access/record#with-refresh-token)
-- also issues a refresh token, rotated on every use. Grant and session keep SurrealDB's defaults
-- (30 days, no limit), so only users inactive for 30 days are signed out; access tokens stay short.

DEFINE ACCESS account ON DATABASE TYPE RECORD
	SIGNUP ( CREATE user SET email = $email, password = crypto::argon2::generate($pass) )
	SIGNIN ( SELECT * FROM user WHERE email = $email
	  AND crypto::argon2::compare(password, $pass) )
	WITH REFRESH
	WITH JWT ALGORITHM HS512 KEY '${JWT_SECRET}'
	DURATION FOR TOKEN 15m
;
