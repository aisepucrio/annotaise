"""Chance-corrected agreement coefficients.

Pure functions, no Django. Every one takes `units`: a mapping of
item id -> list of the values given to that item by the annotators
(one entry per annotator). Values must be hashable; use `frozenset`
for multi-label answers. Items with fewer than 2 responses carry no
information about agreement and are dropped.

Returns `None` when there is nothing to measure, never NaN.
"""

from collections import Counter
from itertools import combinations

import numpy as np

NOMINAL = "nominal"
ORDINAL = "ordinal"
INTERVAL = "interval"
JACCARD = "jaccard"
MASI = "masi"


def _comparable(units):
    return {item: list(values) for item, values in units.items() if len(values) >= 2}


def _ordered_values(units, distance):
    values = {value for responses in units.values() for value in responses}
    if distance in (INTERVAL, ORDINAL):
        return sorted(values)
    return sorted(values, key=str)


def _coincidence(units, values):
    """Krippendorff's coincidence matrix: o[c][k] over every ordered pair."""
    index = {value: position for position, value in enumerate(values)}
    matrix = np.zeros((len(values), len(values)))
    for responses in units.values():
        counts = np.zeros(len(values))
        for value in responses:
            counts[index[value]] += 1
        matrix += (np.outer(counts, counts) - np.diag(counts)) / (len(responses) - 1)
    return matrix


def _set_similarity(left, right, distance):
    union = left | right
    if not union:
        return 1.0
    jaccard = len(left & right) / len(union)
    if distance == JACCARD:
        return jaccard
    # MASI = Jaccard weighted by how nested the two sets are (Passonneau, 2006).
    if not left & right:
        monotonicity = 0.0
    elif left == right:
        monotonicity = 1.0
    elif left <= right or right <= left:
        monotonicity = 2 / 3
    else:
        monotonicity = 1 / 3
    return jaccard * monotonicity


def _delta(values, distance, marginals):
    """Squared difference between every pair of values. Diagonal is always 0."""
    size = len(values)
    if distance == NOMINAL:
        return 1.0 - np.eye(size)

    if distance == INTERVAL:
        points = np.asarray(values, dtype=float)
        return (points[:, None] - points[None, :]) ** 2

    if distance == ORDINAL:
        # values are sorted ascending, so the ranks between c and k are contiguous
        cumulative = np.cumsum(marginals)
        matrix = np.zeros((size, size))
        for low in range(size):
            for high in range(low + 1, size):
                span = cumulative[high] - cumulative[low] + marginals[low]
                matrix[low, high] = matrix[high, low] = (
                    span - (marginals[low] + marginals[high]) / 2.0
                ) ** 2
        return matrix

    matrix = np.zeros((size, size))
    for low in range(size):
        for high in range(low + 1, size):
            similarity = _set_similarity(set(values[low]), set(values[high]), distance)
            matrix[low, high] = matrix[high, low] = 1.0 - similarity
    return matrix


def krippendorff_alpha(units, distance=NOMINAL):
    """alpha = 1 - Do/De. Handles ragged data and any number of annotators."""
    units = _comparable(units)
    if not units:
        return None

    values = _ordered_values(units, distance)
    if len(values) < 2:
        return 1.0

    observed = _coincidence(units, values)
    marginals = observed.sum(axis=1)
    total = marginals.sum()
    if total < 2:
        return None

    delta = _delta(values, distance, marginals)
    disagreement = float((observed * delta).sum()) / total
    expected = float((np.outer(marginals, marginals) * delta).sum()) / (total * (total - 1))
    if expected == 0:
        return 1.0
    return 1.0 - disagreement / expected


def percent_agreement(units):
    """Po: share of same-item annotator pairs that picked the same value."""
    units = _comparable(units)
    agreeing = pairs = 0
    for responses in units.values():
        size = len(responses)
        pairs += size * (size - 1) // 2
        for count in Counter(responses).values():
            agreeing += count * (count - 1) // 2
    return agreeing / pairs if pairs else None


def fleiss_kappa(units):
    """Requires the same number of ratings on every item; raises otherwise."""
    units = _comparable(units)
    if not units:
        return None

    raters = len(next(iter(units.values())))
    if any(len(responses) != raters for responses in units.values()):
        raise ValueError("Fleiss' kappa requires the same number of ratings per item.")

    categories = _ordered_values(units, NOMINAL)
    counts = np.array(
        [[Counter(responses)[category] for category in categories] for responses in units.values()],
        dtype=float,
    )
    observed = (counts * (counts - 1)).sum(axis=1).mean() / (raters * (raters - 1))
    prevalence = counts.sum(axis=0) / counts.sum()
    expected = float((prevalence ** 2).sum())
    if expected == 1:
        return 1.0
    return float((observed - expected) / (1 - expected))


def bootstrap_ci(metric, units, samples=1000, confidence=0.95, seed=0):
    """Percentile CI, resampling items with replacement. None if it can't be built."""
    items = list(units)
    if len(items) < 2:
        return None

    rng = np.random.default_rng(seed)
    estimates = []
    for _ in range(samples):
        draw = rng.integers(0, len(items), len(items))
        # key by position so a twice-drawn item counts twice
        resampled = {position: units[items[index]] for position, index in enumerate(draw)}
        try:
            estimate = metric(resampled)
        except ValueError:
            continue
        if estimate is not None:
            estimates.append(estimate)

    if len(estimates) < samples // 2:
        return None
    tail = (1 - confidence) / 2 * 100
    low, high = np.percentile(estimates, [tail, 100 - tail])
    return float(low), float(high)
