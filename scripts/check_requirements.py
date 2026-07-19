from __future__ import annotations

import re
import sys
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path


REQUIREMENTS_FILE = Path(__file__).resolve().parents[1] / "requirements.txt"
PROJECT_ROOT = REQUIREMENTS_FILE.parent


def parse_requirement(line: str) -> tuple[str, str | None] | None:
    line = line.strip()

    if not line or line.startswith("#"):
        return None

    if line.startswith(("-", "--")):
        return None

    line = line.split(";", 1)[0].strip()

    if "==" in line:
        package_name, expected_version = line.split("==", 1)
        package_name = package_name.split("[", 1)[0].strip()
        return package_name, expected_version.strip()

    package_name = re.split(r"[<>=!~]", line, maxsplit=1)[0].strip()
    package_name = package_name.split("[", 1)[0].strip()
    return package_name, None


def main() -> int:
    if not REQUIREMENTS_FILE.exists():
        print(f"requirements.txt not found: {REQUIREMENTS_FILE}")
        return 1

    missing: list[str] = []
    mismatched: list[tuple[str, str, str]] = []

    print(f"Checking {REQUIREMENTS_FILE}")
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version.split()[0]}")
    print()

    if "shipda" not in sys.executable.lower():
        print("[WARN] This does not look like the conda environment `shipda`.")
        print("Activate the environment first, then run this script again.")
        print()

    print("Required packages:")
    print()

    for line in REQUIREMENTS_FILE.read_text(encoding="utf-8").splitlines():
        parsed = parse_requirement(line)
        if parsed is None:
            continue

        package_name, expected_version = parsed

        try:
            installed_version = version(package_name)
        except PackageNotFoundError:
            missing.append(package_name)
            print(f"[MISSING] {package_name}")
            continue

        if expected_version and installed_version != expected_version:
            mismatched.append((package_name, expected_version, installed_version))
            print(
                f"[VERSION] {package_name}: "
                f"expected {expected_version}, installed {installed_version}"
            )
            continue

        if expected_version:
            print(f"[OK] {package_name}=={installed_version}")
        else:
            print(f"[OK] {package_name} installed ({installed_version})")

    print()

    if missing or mismatched:
        print("Requirements check failed.")
        print()

        if missing:
            print("Missing packages:")
            for package_name in missing:
                print(f"- {package_name}")

        if mismatched:
            print("Version mismatches:")
            for package_name, expected_version, installed_version in mismatched:
                print(
                    f"- {package_name}: expected {expected_version}, "
                    f"installed {installed_version}"
                )

        print()
        print("Fix with:")
        print(f"cd {PROJECT_ROOT}")
        print("python -m pip install -r requirements.txt")
        print("python scripts/check_requirements.py")
        return 1

    print("All requirements are installed correctly.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
