from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PIPELINE_ROOT / "data"
CONFIG_DIR = PIPELINE_ROOT / "config"
RAW_DIR = PIPELINE_ROOT / "raw"
STATE_DB_PATH = PIPELINE_ROOT / "state.db"
THRESHOLDS_PATH = CONFIG_DIR / "thresholds.yaml"
NORMALIZATION_PATH = DATA_DIR / "normalization.yaml"
CEFRJ_CSV_PATH = DATA_DIR / "cefrj-vocabulary-profile-1.5.csv"
OCTANOVE_CSV_PATH = DATA_DIR / "octanove-vocabulary-profile-c1c2-1.0.csv"
AUTHOR_OVERRIDES_PATH = DATA_DIR / "author_overrides.yaml"


@dataclass(frozen=True)
class Settings:
    database_url: str
    supabase_url: str
    supabase_service_role_key: str
    anthropic_api_key: str


def load_settings() -> Settings:
    load_dotenv(PIPELINE_ROOT / ".env")

    missing = [
        name
        for name in ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
        if not os.environ.get(name)
    ]
    if missing:
        raise RuntimeError(
            f"Missing required env vars: {', '.join(missing)}. "
            "Copy pipeline/.env.example to pipeline/.env and fill in."
        )

    return Settings(
        database_url=os.environ["DATABASE_URL"],
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_service_role_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
    )
