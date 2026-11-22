-- From https://surrealdb.com/docs/reference/query-language/statements/define/access/record#example-usage
-- Kept our `password` field name instead of the docs' `pass`.

DEFINE ACCESS account ON DATABASE TYPE RECORD
	SIGNUP ( CREATE user SET email = $email, password = crypto::argon2::generate($pass) )
	SIGNIN ( SELECT * FROM user WHERE email = $email
	  AND crypto::argon2::compare(password, $pass) )
	DURATION FOR TOKEN 15m, FOR SESSION 12h
;
