#!/usr/bin/env python3
"""
Minimal App Store Connect API client.

Signs an ES256 JWT with the team key and issues a request. Kept dependency-free
beyond `cryptography` (already present in the system Python) so it works on a bare
machine without installing PyJWT.

Env:
    ASC_KEY_ID     App Store Connect API key id (the XXXX in AuthKey_XXXX.p8)
    ASC_ISSUER_ID  issuer id from Users and Access -> Integrations
    ASC_KEY_PATH   optional; defaults to ~/.appstoreconnect/private_keys/AuthKey_<id>.p8

Usage:
    ./asc.py GET  /v1/apps
    ./asc.py GET  '/v1/builds?filter[app]=123&limit=5'
    ./asc.py POST /v1/betaGroups '{"data": {...}}'
    ./asc.py PATCH /v1/builds/123 '{"data": {...}}'
"""
from __future__ import annotations  # system python is 3.9; keeps `str | None` valid

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils

BASE = "https://api.appstoreconnect.apple.com"


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def token() -> str:
    key_id = os.environ["ASC_KEY_ID"]
    issuer = os.environ["ASC_ISSUER_ID"]
    path = os.environ.get(
        "ASC_KEY_PATH",
        os.path.expanduser(f"~/.appstoreconnect/private_keys/AuthKey_{key_id}.p8"),
    )
    with open(path, "rb") as fh:
        key = serialization.load_pem_private_key(fh.read(), password=None)

    now = int(time.time())
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    # 20 min is the maximum Apple accepts for a team key.
    payload = {"iss": issuer, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}
    signing_input = f"{_b64(json.dumps(header).encode())}.{_b64(json.dumps(payload).encode())}"

    der = key.sign(signing_input.encode(), ec.ECDSA(hashes.SHA256()))
    r, s = utils.decode_dss_signature(der)
    raw = r.to_bytes(32, "big") + s.to_bytes(32, "big")  # JWS wants R||S, not DER
    return f"{signing_input}.{_b64(raw)}"


def request(method: str, path: str, body: str | None = None):
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=body.encode() if body else None,
        headers={
            "Authorization": f"Bearer {token()}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as err:
        raw = err.read()
        return err.code, json.loads(raw) if raw else None


if __name__ == "__main__":
    method, path = sys.argv[1], sys.argv[2]
    body = sys.argv[3] if len(sys.argv) > 3 else None
    status, data = request(method, path, body)
    print(f"HTTP {status}")
    if data is not None:
        print(json.dumps(data, indent=2))
