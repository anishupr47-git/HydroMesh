"""CLI administrative utility for HydroMesh (grant-admin)."""

from __future__ import annotations

import sys

from hydromesh.db.database import db


def main() -> None:
    if len(sys.argv) < 3 or sys.argv[1] != "grant-admin":
        print("Usage: python -m hydromesh.auth grant-admin <email>")
        sys.exit(1)

    email = sys.argv[2]
    success = db.grant_admin(email)
    if success:
        print(f"Successfully granted admin privileges to: {email}")
    else:
        print(f"Error: User with email '{email}' not found.")
        sys.exit(1)


if __name__ == "__main__":
    main()
