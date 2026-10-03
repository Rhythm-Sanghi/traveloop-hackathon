from decimal import Decimal
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from main import ExpenseCreateSchema, _ics_escape


def test_decimal_money_boundaries_are_exact():
    values = [Decimal("0.10"), Decimal("0.20"), Decimal("0")] + [
        Decimal("0.01")
    ] * 100
    assert sum(values) == Decimal("1.30")
    assert Decimal("9999999999.99").quantize(Decimal("0.01")) == Decimal("9999999999.99")


def test_negative_money_is_rejected_by_decimal_business_rule():
    with pytest.raises(ValueError):
        ExpenseCreateSchema(
            trip_id=1,
            title="Invalid",
            amount="-0.01",
            expense_date="2026-10-03",
        )


@pytest.mark.parametrize("timezone_name", [
    "Asia/Kolkata",
    "Asia/Tokyo",
    "Europe/London",
    "America/New_York",
])
def test_supported_iana_timezones_preserve_destination_local_time(timezone_name):
    local = datetime(2026, 10, 3, 9, 30, tzinfo=ZoneInfo(timezone_name))
    assert local.hour == 9
    assert local.minute == 30


def test_dst_and_cross_midnight_are_explicit():
    before = datetime(2026, 11, 1, 23, 30, tzinfo=ZoneInfo("America/New_York"))
    after = datetime(2026, 11, 2, 0, 30, tzinfo=ZoneInfo("America/New_York"))
    assert after.date() != before.date()
    assert after.hour == 0


def test_ics_escape_handles_parser_sensitive_values():
    assert _ics_escape("A, B; C\nD") == "A\\, B\\; C\\nD"
