import numpy as np

"""
NOTE: 
This file implements a FAIR Monte Carlo estimator.

It is not part of the core contribution of this project. 
It remains included for completeness and future extension, but is considered supplementary and is not essential
to the attack graph engine
"""
def simulate_scenario_mc(
    *,
    tef_spec, vuln_spec, plm_spec, slef_spec, slm_spec,
    trials=20000, seed=None
):
    """Run Monte Carlo for a FAIR scenario using triangular/PERT sampling."""
    rng = np.random.default_rng(seed)

    tef = _sample_spec(tef_spec, trials)
    vuln = np.clip(_sample_spec(vuln_spec, trials), 0.0, 1.0)
    plm = _sample_spec(plm_spec, trials)
    slef = _sample_spec(slef_spec, trials)
    slm = _sample_spec(slm_spec, trials)

    lef = tef * vuln
    lm = plm + slef * slm
    ale = lef * lm

    summary = {
        "mean": float(np.mean(ale)),
        "p10": float(np.percentile(ale, 10)),
        "p50": float(np.percentile(ale, 50)),
        "p90": float(np.percentile(ale, 90)),
    }
    return summary

def _sample_spec(spec, n, rng=None):
    """
    Sample an array of size n from the given spec dict.
    Supports: PERT, TRIANGULAR, LOGNORMAL, FIXED
    """
    import numpy as np

    if rng is None:
        rng = np.random.default_rng()

    dist = str(spec.get("dist", "PERT")).upper()

    # --- FIXED ---
    if dist == "FIXED":
        v = float(spec.get("value", spec.get("mode", spec.get("ml", 0.0))))
        return np.full(n, v, dtype=float)

    # --- LOGNORMAL ---
    if dist == "LOGNORMAL":
        mu = float(spec.get("mu", 0.0))
        sigma = float(spec.get("sigma", 1.0))
        return rng.lognormal(mean=mu, sigma=max(sigma, 1e-9), size=n)

    # --- PERT ---
    if dist == "PERT":
        mn = float(spec.get("min", 0.0))
        md = float(spec.get("mode", spec.get("ml", mn)))
        mx = float(spec.get("max", max(md, mn)))
        if mx == mn:
            return np.full(n, mn)
        width = max(mx - mn, 1e-9)
        a = 1.0 + 4.0 * (md - mn) / width
        b = 1.0 + 4.0 * (mx - md) / width
        x = rng.beta(a, b, size=n)
        return mn + x * (mx - mn)

    # --- TRIANGULAR ---
    if dist == "TRIANGULAR":
        mn = float(spec.get("min", 0.0))
        md = float(spec.get("mode", spec.get("ml", mn)))
        mx = float(spec.get("max", max(md, mn)))
        if mx == mn:
            return np.full(n, mn)
        # NumPy triangular order: (left, mode, right)
        return rng.triangular(mn, md, mx, size=n)

    raise ValueError(f"Unsupported dist: {dist}")

def fair_simulate(cf_samples, vuln_samples, loss_spec, n=None):
    if n is None: n = min(len(cf_samples), len(vuln_samples))
    cf = np.array(cf_samples[:n], float)
    vuln = np.clip(np.array(vuln_samples[:n], float), 0, 1)
    slm = _sample_spec(loss_spec, n)
    loss = cf * vuln * slm
    loss.sort()
    q = lambda p: float(loss[int(p*(len(loss)-1))])
    return {"ALE": float(loss.mean()), "P10": q(0.10), "P50": q(0.50), "P90": q(0.90),
            "TEF_mean": float(cf.mean()), "Vuln_mean": float(vuln.mean())}