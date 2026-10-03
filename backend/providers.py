import os
from json import JSONDecodeError
from dataclasses import dataclass
from typing import Any, Dict, List
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json


class PlacesProviderUnavailable(Exception):
    """Raised when external place discovery is not configured or reachable."""


@dataclass
class PlacesProvider:
    provider: str
    api_key: str

    def search_places(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        if self.provider != "geoapify" or not self.api_key:
            raise PlacesProviderUnavailable("Place search is not configured")

        params = urlencode({
            "text": query,
            "apiKey": self.api_key,
            "limit": min(max(limit, 1), 20),
            "format": "json",
        })
        request = Request(
            f"https://api.geoapify.com/v1/geocode/search?{params}",
            headers={"Accept": "application/json"},
        )
        try:
            with urlopen(request, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, JSONDecodeError, UnicodeDecodeError) as exc:
            raise PlacesProviderUnavailable("Place search provider is unavailable") from exc

        results = []
        for item in payload.get("results", []):
            results.append({
                "provider": "geoapify",
                "provider_id": item.get("place_id"),
                "name": item.get("name") or item.get("formatted"),
                "address": item.get("formatted"),
                "city": item.get("city"),
                "country": item.get("country"),
                "latitude": item.get("lat"),
                "longitude": item.get("lon"),
                "website": item.get("website"),
            })
        return results


def get_places_provider() -> PlacesProvider:
    return PlacesProvider(
        provider=os.getenv("PLACES_PROVIDER", "").strip().lower(),
        api_key=os.getenv("PLACES_API_KEY", "").strip(),
    )
