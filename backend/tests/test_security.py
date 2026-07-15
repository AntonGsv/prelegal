from prelegal_api import security


def test_hash_password_roundtrips():
    stored = security.hash_password("correct horse battery staple")

    assert stored.startswith("pbkdf2_sha256$")
    assert security.verify_password("correct horse battery staple", stored) is True
    assert security.verify_password("wrong password", stored) is False


def test_hash_password_uses_a_random_salt():
    first = security.hash_password("same-password")
    second = security.hash_password("same-password")

    assert first != second
    assert security.verify_password("same-password", first)
    assert security.verify_password("same-password", second)


def test_verify_password_rejects_malformed_hash():
    assert security.verify_password("x", "not-a-real-hash") is False
    assert security.verify_password("x", "") is False


def test_token_roundtrips():
    token = security.create_token(42, "user@example.com", "secret", ttl_seconds=60)

    payload = security.decode_token(token, "secret")
    assert payload is not None
    assert payload["sub"] == 42
    assert payload["email"] == "user@example.com"


def test_token_rejects_wrong_secret():
    token = security.create_token(1, "a@b.com", "secret", ttl_seconds=60)

    assert security.decode_token(token, "different-secret") is None


def test_token_rejects_tampered_payload():
    token = security.create_token(1, "a@b.com", "secret", ttl_seconds=60)
    payload_segment, signature = token.split(".")
    tampered = f"{payload_segment}x.{signature}"

    assert security.decode_token(tampered, "secret") is None


def test_token_rejects_when_expired():
    token = security.create_token(
        1, "a@b.com", "secret", ttl_seconds=60, issued_at=1_000
    )

    # 61 seconds after issuance the 60s token is expired.
    assert security.decode_token(token, "secret", now=1_061) is None
    # Still valid one second before expiry.
    assert security.decode_token(token, "secret", now=1_059) is not None


def test_decode_token_handles_garbage():
    assert security.decode_token("garbage", "secret") is None
    assert security.decode_token("", "secret") is None
