from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the Prelegal API."""

    database_url: str = "file:./data/prelegal.db"
    cors_origins: str = "http://localhost:3000"

    # OpenRouter key for the AI chat. It is conventionally set without the
    # PRELEGAL_ prefix (see .env / docker-compose), so read the bare name.
    openrouter_api_key: str = Field(default="", validation_alias="OPENROUTER_API_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="PRELEGAL_",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
