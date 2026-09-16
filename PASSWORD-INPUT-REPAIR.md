# Exact password input repair

Sign-in, signup and password update previously used requiredString, which trims
leading and trailing whitespace. This silently changed the credential sent to
Supabase and prevented sign-in to accounts whose actual password includes those
characters. The three actions now use readPassword, which preserves the exact
nonempty string and rejects missing, empty or file-valued inputs. Signup and
update retain the existing 12-character minimum; Supabase remains responsible
for authentication and password policy. Email normalization is unchanged.

Two regression tests cover boundary whitespace, tabs/newlines, composed and
combining Unicode, and invalid FormData values. No passwords are logged, echoed,
stored by this helper or retried in a modified form. There is no fallback that
tries a trimmed credential. Existing account passwords are not changed. Accounts
previously created with the old behavior retain the credential stored at creation;
normal password recovery is the way to choose a different one.

Verification is local and CI only, with synthetic strings. No real authentication,
password update, email, account creation or credential access was performed.
