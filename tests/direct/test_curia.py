"""
Direct-mode tests for curia.py — the deterministic surface of the contract
without GenLayer's AI/consensus stack. Run with:
    python -m pytest tests/direct -q

The genlayer runtime is stubbed (verified attribute names:
gl.message.sender_address / gl.message.value; no block clock). The AI
pipeline is exercised by priming gl.eq_principle.prompt_non_comparative
with canned rulings, so the bookkeeping around every ruling — tier maths,
pull-payments, residual reclaim, sanitization of malformed verdicts — is
proven deterministically.
"""

import importlib.util
import json
import pathlib
import sys
import types
import pytest


CONTRACT_PATH = pathlib.Path(__file__).resolve().parents[2] / "contracts" / "curia.py"


# ── GenLayer runtime stubs ───────────────────────────────────────────────────

class _UserError(Exception):
    pass


class _VmModule:
    UserError = _UserError


class _TreeMap(dict):
    def get(self, k, default=None):
        return super().get(k, default)


class _U256(int):
    def __new__(cls, v):
        return super().__new__(cls, int(v))


class _PublicViewDeco:
    def __call__(self, fn):
        return fn


class _PublicWriteDeco:
    payable = staticmethod(lambda fn: fn)

    def __call__(self, fn):
        return fn


class _Public:
    view = _PublicViewDeco()
    write = _PublicWriteDeco()


class _FakeEmit:
    def __init__(self):
        self.transfers = []   # (to, value, on)

    def bind(self, to):
        self._to = to
        return self

    def emit_transfer(self, value, on=None):
        self.transfers.append((self._to, int(value), on))

    def total_to(self, addr):
        return sum(v for (t, v, _) in self.transfers if t.lower() == addr.lower())


class _EqPrinciple:
    canned_output = "{}"
    last_input = None

    @classmethod
    def prompt_non_comparative(cls, fn, task=None, criteria=None):
        # Run the input builder exactly like the principle would, so fetch
        # behaviour inside build_input is exercised too.
        cls.last_input = fn()
        return cls.canned_output


class _NondetWeb:
    @staticmethod
    def render(url, mode="text"):
        if "dead" in url:
            raise RuntimeError("403 forbidden")
        return f"stub content for {url}"


class _Nondet:
    web = _NondetWeb()


class _GL:
    class Contract:
        pass

    public = _Public()
    vm = _VmModule
    eq_principle = _EqPrinciple
    nondet = _Nondet()

    class message:
        sender_address = "0x0000000000000000000000000000000000000000"
        value = 0

    _emit = None

    @staticmethod
    def get_contract_at(addr):
        return _GL._emit.bind(str(addr))


def _install_stub():
    mod = types.ModuleType("genlayer")
    mod.gl = _GL
    mod.TreeMap = _TreeMap
    mod.u256 = _U256
    mod.Address = lambda x: x
    mod.__all__ = ["gl", "TreeMap", "u256", "Address"]
    sys.modules["genlayer"] = mod


_install_stub()


def _load_contract():
    spec = importlib.util.spec_from_file_location("curia_contract", CONTRACT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# ── Fixtures + helpers ───────────────────────────────────────────────────────

SPONSOR = "0xccc1111111111111111111111111111111111111"
ALICE   = "0xaaa2222222222222222222222222222222222222"
BOB     = "0xbbb3333333333333333333333333333333333333"
CAROL   = "0xddd4444444444444444444444444444444444444"

GEN = 10 ** 18
POOL = GEN  # 1 GEN pool
TIERS = [5000, 3000, 2000]   # 50/30/20

BRIEF = "Build the best GenLayer dApp demo for the summer round of grants."
CRIT  = "Working code, verifiable repo, clear GenLayer use case."
CASE  = "We built a full working dApp with tests and a live deployment link."


@pytest.fixture
def module():
    m = _load_contract()
    m.gl._emit = _FakeEmit()
    return m


def _as(m, addr, value=0):
    m.gl.message.sender_address = addr
    m.gl.message.value = value


def _mk_round(m, c, tiers=None, pool=POOL):
    _as(m, SPONSOR, pool)
    return c.create_round("Summer Grants", BRIEF, CRIT, tiers or list(TIERS))


def _enter(m, c, rid, who, urls=None):
    _as(m, who, 0)
    return c.submit_entry(rid, CASE, urls or ["https://github.com/example/repo"])


def _verdict(assignments, confidence=90, summary="The court has ruled."):
    return json.dumps(
        {"assignments": assignments, "confidence": confidence, "summary": summary}
    )


# ── Round creation ───────────────────────────────────────────────────────────

def test_create_round_happy_path(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    assert rnd["status"] == "OPEN"
    assert rnd["pool_wei"] == str(POOL)
    assert rnd["tiers_bps"] == TIERS
    assert c.get_protocol_stats()["total_pool_volume_wei"] == str(POOL)


def test_create_round_rejects_underfunded(module):
    c = module.Curia()
    _as(module, SPONSOR, 10 ** 16)  # 0.01 GEN < min
    with pytest.raises(module.gl.vm.UserError, match="at least"):
        c.create_round("Summer Grants", BRIEF, CRIT, list(TIERS))


def test_create_round_rejects_bad_tiers(module):
    c = module.Curia()
    _as(module, SPONSOR, POOL)
    with pytest.raises(module.gl.vm.UserError, match="sum"):
        c.create_round("Summer Grants", BRIEF, CRIT, [5000, 3000])
    with pytest.raises(module.gl.vm.UserError, match="non-ascending"):
        c.create_round("Summer Grants", BRIEF, CRIT, [2000, 3000, 5000])
    with pytest.raises(module.gl.vm.UserError, match="positive"):
        c.create_round("Summer Grants", BRIEF, CRIT, [10000, 0])
    with pytest.raises(module.gl.vm.UserError, match="tiers"):
        c.create_round("Summer Grants", BRIEF, CRIT, [4000, 3000, 1500, 800, 500, 200])


def test_create_round_allows_equal_tiers(module):
    c = module.Curia()
    _as(module, SPONSOR, POOL)
    rnd = c.create_round("Summer Grants", BRIEF, CRIT, [3334, 3333, 3333])
    assert rnd["tiers_bps"] == [3334, 3333, 3333]


# ── Entries ──────────────────────────────────────────────────────────────────

def test_submit_entry_happy_path(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    e = _enter(module, c, rnd["round_id"], ALICE)
    assert e["tier"] is None
    assert c.get_round(rnd["round_id"])["entry_count"] == 1
    assert c.get_entries_by_round(rnd["round_id"])[0]["applicant"] == ALICE


def test_sponsor_cannot_enter_own_round(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _as(module, SPONSOR, 0)
    with pytest.raises(module.gl.vm.UserError, match="own round"):
        c.submit_entry(rnd["round_id"], CASE, ["https://github.com/x/y"])


def test_one_entry_per_applicant(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _enter(module, c, rnd["round_id"], ALICE)
    with pytest.raises(module.gl.vm.UserError, match="One entry"):
        _enter(module, c, rnd["round_id"], ALICE)


def test_entry_cap_enforced(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    for i in range(8):
        _enter(module, c, rnd["round_id"], f"0x{i:040x}")
    with pytest.raises(module.gl.vm.UserError, match="full"):
        _enter(module, c, rnd["round_id"], ALICE)


def test_no_entries_after_close(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _as(module, SPONSOR, 0)
    c.close_entries(rnd["round_id"])
    with pytest.raises(module.gl.vm.UserError, match="not open"):
        _enter(module, c, rnd["round_id"], ALICE)


# ── Closing ──────────────────────────────────────────────────────────────────

def test_only_sponsor_closes(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _as(module, ALICE, 0)
    with pytest.raises(module.gl.vm.UserError, match="sponsor"):
        c.close_entries(rnd["round_id"])


def test_empty_close_marks_full_residual(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _as(module, SPONSOR, 0)
    out = c.close_entries(rnd["round_id"])
    assert out["residual_wei"] == str(POOL)


# ── Adjudication ─────────────────────────────────────────────────────────────

def _closed_round_with_three(module, c):
    rnd = _mk_round(module, c)
    rid = rnd["round_id"]
    e1 = _enter(module, c, rid, ALICE)
    e2 = _enter(module, c, rid, BOB)
    e3 = _enter(module, c, rid, CAROL)
    _as(module, SPONSOR, 0)
    c.close_entries(rid)
    return rid, e1, e2, e3


def test_adjudicate_full_podium(module):
    c = module.Curia()
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e2["entry_id"], "tier": 0, "reasoning": "strongest evidence"},
        {"entry_id": e1["entry_id"], "tier": 1, "reasoning": "solid"},
        {"entry_id": e3["entry_id"], "tier": 2, "reasoning": "thin but real"},
    ])
    _as(module, ALICE, 0)  # anyone can trigger
    v = c.adjudicate(rid)
    assert v["awarded_wei"] == str(POOL)          # 50+30+20 = full pool
    assert v["residual_wei"] == "0"
    assert c.get_entry(e2["entry_id"])["awarded_wei"] == str(POOL * 5000 // 10000)
    assert c.get_entry(e1["entry_id"])["awarded_wei"] == str(POOL * 3000 // 10000)
    assert c.get_round(rid)["status"] == "ADJUDICATED"


def test_adjudicate_requires_closed(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _enter(module, c, rnd["round_id"], ALICE)
    with pytest.raises(module.gl.vm.UserError, match="closed"):
        c.adjudicate(rnd["round_id"])


def test_adjudicate_empty_docket_refused(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _as(module, SPONSOR, 0)
    c.close_entries(rnd["round_id"])
    with pytest.raises(module.gl.vm.UserError, match="empty"):
        c.adjudicate(rnd["round_id"])


def test_no_award_leaves_residual(module):
    c = module.Curia()
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e1["entry_id"], "tier": 0, "reasoning": "clear winner"},
        {"entry_id": e2["entry_id"], "tier": "NO_AWARD", "reasoning": "unverified"},
        {"entry_id": e3["entry_id"], "tier": "NO_AWARD", "reasoning": "unverified"},
    ])
    v = c.adjudicate(rid)
    assert v["awarded_wei"] == str(POOL * 5000 // 10000)
    assert int(v["residual_wei"]) == POOL - POOL * 5000 // 10000


def test_malformed_verdict_sanitized(module):
    """Duplicate tiers, unknown ids, out-of-range tiers -> demoted, never paid."""
    c = module.Curia()
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e1["entry_id"], "tier": 0, "reasoning": "winner"},
        {"entry_id": e2["entry_id"], "tier": 0, "reasoning": "duplicate tier"},
        {"entry_id": "999", "tier": 1, "reasoning": "unknown entry"},
        {"entry_id": e3["entry_id"], "tier": 7, "reasoning": "tier out of range"},
    ])
    v = c.adjudicate(rid)
    assert c.get_entry(e1["entry_id"])["tier"] == 0
    assert c.get_entry(e2["entry_id"])["tier"] == "NO_AWARD"
    assert c.get_entry(e3["entry_id"])["tier"] == "NO_AWARD"
    # Only tier 0 paid out; the rest is residual.
    assert v["awarded_wei"] == str(POOL * 5000 // 10000)


def test_missing_assignment_defaults_no_award(module):
    c = module.Curia()
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e1["entry_id"], "tier": 0, "reasoning": "only ruling"},
    ])
    c.adjudicate(rid)
    assert c.get_entry(e2["entry_id"])["tier"] == "NO_AWARD"
    assert c.get_entry(e3["entry_id"])["tier"] == "NO_AWARD"


def test_dead_evidence_url_does_not_crash(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    rid = rnd["round_id"]
    e1 = _enter(module, c, rid, ALICE, urls=["https://dead.example.com/gone"])
    _as(module, SPONSOR, 0)
    c.close_entries(rid)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e1["entry_id"], "tier": "NO_AWARD", "reasoning": "evidence unreachable"},
    ])
    c.adjudicate(rid)
    assert "UNREACHABLE" in module.gl.eq_principle.last_input


# ── Claims ───────────────────────────────────────────────────────────────────

def _adjudicated_round(module, c):
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e1["entry_id"], "tier": 0, "reasoning": "winner"},
        {"entry_id": e2["entry_id"], "tier": 1, "reasoning": "runner-up"},
        {"entry_id": e3["entry_id"], "tier": "NO_AWARD", "reasoning": "no"},
    ])
    c.adjudicate(rid)
    return rid, e1, e2, e3


def test_claim_pays_winner(module):
    c = module.Curia()
    rid, e1, e2, e3 = _adjudicated_round(module, c)
    _as(module, ALICE, 0)
    out = c.claim_award(e1["entry_id"])
    assert out["claimed"] is True
    assert module.gl._emit.total_to(ALICE) == POOL * 5000 // 10000
    assert c.get_protocol_stats()["total_awarded_wei"] == str(POOL * 5000 // 10000)


def test_claim_wrong_wallet_rejected(module):
    c = module.Curia()
    rid, e1, e2, e3 = _adjudicated_round(module, c)
    _as(module, BOB, 0)
    with pytest.raises(module.gl.vm.UserError, match="applicant"):
        c.claim_award(e1["entry_id"])


def test_double_claim_rejected(module):
    c = module.Curia()
    rid, e1, e2, e3 = _adjudicated_round(module, c)
    _as(module, ALICE, 0)
    c.claim_award(e1["entry_id"])
    with pytest.raises(module.gl.vm.UserError, match="already claimed"):
        c.claim_award(e1["entry_id"])


def test_no_award_entry_cannot_claim(module):
    c = module.Curia()
    rid, e1, e2, e3 = _adjudicated_round(module, c)
    _as(module, CAROL, 0)
    with pytest.raises(module.gl.vm.UserError, match="not awarded"):
        c.claim_award(e3["entry_id"])


# ── Residual reclaim ─────────────────────────────────────────────────────────

def test_reclaim_after_partial_award(module):
    c = module.Curia()
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e1["entry_id"], "tier": 0, "reasoning": "winner"},
        {"entry_id": e2["entry_id"], "tier": "NO_AWARD", "reasoning": "no"},
        {"entry_id": e3["entry_id"], "tier": "NO_AWARD", "reasoning": "no"},
    ])
    c.adjudicate(rid)
    _as(module, SPONSOR, 0)
    c.reclaim_residual(rid)
    expected = POOL - POOL * 5000 // 10000
    assert module.gl._emit.total_to(SPONSOR) == expected
    with pytest.raises(module.gl.vm.UserError, match="already"):
        c.reclaim_residual(rid)


def test_reclaim_empty_round_full_pool(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _as(module, SPONSOR, 0)
    c.close_entries(rnd["round_id"])
    c.reclaim_residual(rnd["round_id"])
    assert module.gl._emit.total_to(SPONSOR) == POOL


def test_reclaim_blocked_before_adjudication(module):
    c = module.Curia()
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    _as(module, SPONSOR, 0)
    with pytest.raises(module.gl.vm.UserError, match="awaits adjudication"):
        c.reclaim_residual(rid)


def test_reclaim_only_sponsor(module):
    c = module.Curia()
    rnd = _mk_round(module, c)
    _as(module, SPONSOR, 0)
    c.close_entries(rnd["round_id"])
    _as(module, ALICE, 0)
    with pytest.raises(module.gl.vm.UserError, match="sponsor"):
        c.reclaim_residual(rnd["round_id"])


# ── Ledger conservation ──────────────────────────────────────────────────────

def test_pool_conservation(module):
    """Everything paid out + residual reclaimed == the deposited pool."""
    c = module.Curia()
    rid, e1, e2, e3 = _closed_round_with_three(module, c)
    module.gl.eq_principle.canned_output = _verdict([
        {"entry_id": e1["entry_id"], "tier": 0, "reasoning": "w"},
        {"entry_id": e2["entry_id"], "tier": 1, "reasoning": "r"},
        {"entry_id": e3["entry_id"], "tier": "NO_AWARD", "reasoning": "n"},
    ])
    c.adjudicate(rid)
    _as(module, ALICE, 0); c.claim_award(e1["entry_id"])
    _as(module, BOB, 0);   c.claim_award(e2["entry_id"])
    _as(module, SPONSOR, 0); c.reclaim_residual(rid)
    total_out = sum(v for (_, v, _) in module.gl._emit.transfers)
    assert total_out == POOL
