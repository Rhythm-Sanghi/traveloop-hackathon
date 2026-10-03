import pytest

from providers import PlacesProvider, PlacesProviderUnavailable
from main import _ics_escape


def test_unconfigured_places_provider_fails_truthfully():
    provider = PlacesProvider(provider="", api_key="")

    with pytest.raises(PlacesProviderUnavailable):
        provider.search_places("Tokyo")


def test_places_provider_clamps_result_limit(monkeypatch):
    captured = {}

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            return b'{"results":[]}'

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["timeout"] = timeout
        return Response()

    monkeypatch.setattr("providers.urlopen", fake_urlopen)
    PlacesProvider(provider="geoapify", api_key="test").search_places("Tokyo", limit=100)

    assert "limit=20" in captured["url"]
    assert captured["timeout"] == 8


def test_ics_values_escape_calendar_delimiters():
    assert _ics_escape("Tokyo, Japan; evening\nwalk") == "Tokyo\\, Japan\\; evening\\nwalk"
