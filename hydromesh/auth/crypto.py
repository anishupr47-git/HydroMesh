"""Argon2id Password Hashing and Timing-Equalized Verification.

Overview:
    Provides cryptographic password hashing, constant-time verification, and password complexity
    enforcement designed to prevent brute-force and side-channel timing attacks.

Core Security Protections:
    1. Argon2id Key Derivation: Utilizes memory-hard Argon2id hashing configured to resist GPU/ASIC
       cracking attacks and rainbow table generation.
    2. Side-Channel Timing Defense: Equalizes execution duration for non-existent users by performing
       a synthetic verification cycle, preventing user enumeration via timing discrepancies.
    3. Password Policy Enforcement: Requires minimum entropy (>=12 characters) and blocks common
       breached passwords.
"""

from __future__ import annotations

import contextlib
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from hydromesh.logging import get_logger

log = get_logger(__name__)

COMMON_PASSWORDS_FILE = Path("data/common_passwords.txt")

# OWASP Recommended Argon2id parameters
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
)

# Dummy hash precomputed at startup for timing equalization on non-existent users
_DUMMY_HASH = _hasher.hash("dummy_probe_password_timing_neutral_1234!")


def _load_common_passwords() -> frozenset[str]:
    if not COMMON_PASSWORDS_FILE.is_file():
        return frozenset()
    lines = COMMON_PASSWORDS_FILE.read_text(encoding="utf-8").splitlines()
    return frozenset(p.strip().lower() for p in lines if p.strip())


_COMMON_PASSWORDS = _load_common_passwords()


def validate_password_strength(password: str) -> None:
    """Validate password against length requirements and common password dictionary."""
    if len(password) < 12:
        raise ValueError("Password must be at least 12 characters long.")
    if len(password) > 128:
        raise ValueError("Password cannot exceed 128 characters.")
    if password.lower() in _COMMON_PASSWORDS:
        raise ValueError("Password is too common and easily guessed. Please choose a stronger passphrase.")


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    validate_password_strength(password)
    return _hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return _hasher.verify(hashed, password)
    except (VerifyMismatchError, Exception):
        return False


def verify_dummy_timing() -> None:
    """Perform a timing-neutral dummy hash check to mitigate account enumeration."""
    with contextlib.suppress(Exception):
        _hasher.verify(_DUMMY_HASH, "incorrect_dummy_attempt_password")
