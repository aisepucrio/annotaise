"""Regression tests for numeric alpha, independently of Django or a database."""

from collections import Counter
from math import isfinite
from random import Random
from unittest import TestCase
from unittest.mock import patch

from .services import metrics


def pairwise_alpha(units, distance):
    """Slow reference: directly sum disagreements over ordered rating pairs."""
    panels = [responses for responses in units.values() if len(responses) >= 2]
    ratings = [value for responses in panels for value in responses]
    if not ratings:
        return None
    counts = Counter(ratings)

    def delta(left, right):
        if distance == metrics.INTERVAL:
            return (left - right) ** 2
        if left == right:
            return 0.0
        low, high = sorted((left, right))
        between = sum(count for value, count in counts.items() if low < value < high)
        return (between + (counts[low] + counts[high]) / 2) ** 2

    total = len(ratings)
    expected = sum(delta(left, right) for left in ratings for right in ratings) / (total * (total - 1))
    if expected == 0:
        return 1.0
    observed = sum(
        sum(delta(left, right) for left in responses for right in responses) / (len(responses) - 1)
        for responses in panels
    ) / total
    return 1 - observed / expected


class NumericAlphaTest(TestCase):
    def test_matches_pairwise_definition_with_ragged_panels_and_ties(self):
        rng = Random(1729)
        for sample in range(30):
            units = {
                item: [rng.choice([-3.5, -1.0, 0.0, 2.25, 8.0]) for _ in range(rng.randrange(6))]
                for item in range(12)
            }
            for distance in (metrics.INTERVAL, metrics.ORDINAL):
                with self.subTest(sample=sample, distance=distance):
                    self.assertAlmostEqual(
                        metrics.krippendorff_alpha(units, distance), pairwise_alpha(units, distance), places=12
                    )

    def test_matches_pairwise_definition_with_distinct_continuous_values(self):
        rng = Random(42)
        units = {item: [rng.uniform(-20, 20) for _ in range(2 + item % 4)] for item in range(15)}
        for distance in (metrics.INTERVAL, metrics.ORDINAL):
            with self.subTest(distance=distance):
                self.assertAlmostEqual(
                    metrics.krippendorff_alpha(units, distance), pairwise_alpha(units, distance), places=12
                )

    def test_empty_and_single_rating_items_are_excluded(self):
        comparable = {0: [0, 1], 1: [2, 2, 3]}
        with_missing = comparable | {2: [], 3: [-1000], 4: [1000]}
        for distance in (metrics.INTERVAL, metrics.ORDINAL):
            with self.subTest(distance=distance):
                self.assertIsNone(metrics.krippendorff_alpha({}, distance))
                self.assertIsNone(metrics.krippendorff_alpha({0: [], 1: [1]}, distance))
                self.assertEqual(
                    metrics.krippendorff_alpha(with_missing, distance),
                    metrics.krippendorff_alpha(comparable, distance),
                )

    def test_perfect_agreement_and_constant_values(self):
        for distance in (metrics.INTERVAL, metrics.ORDINAL):
            for units in ({0: [4, 4]}, {0: [4, 4], 1: [4, 4, 4]}, {0: [1, 1], 1: [5, 5, 5]}):
                with self.subTest(distance=distance, units=units):
                    self.assertEqual(metrics.krippendorff_alpha(units, distance), 1.0)

    def test_negative_alpha_is_preserved(self):
        for distance in (metrics.INTERVAL, metrics.ORDINAL):
            with self.subTest(distance=distance):
                self.assertAlmostEqual(metrics.krippendorff_alpha({0: [0, 1], 1: [0, 1]}, distance), -0.5)
                self.assertAlmostEqual(metrics.krippendorff_alpha({0: [0, 1]}, distance), 0.0)

    def test_interval_alpha_is_stable_at_large_offsets(self):
        units = {0: [0.0, 0.25], 1: [0.5, 1.0, 1.25], 2: [2.0, 2.0]}
        shifted = {item: [1e12 + value for value in responses] for item, responses in units.items()}
        expected = pairwise_alpha(units, metrics.INTERVAL)
        self.assertAlmostEqual(metrics.krippendorff_alpha(shifted, metrics.INTERVAL), expected, places=12)

    def test_ordinal_alpha_depends_on_order_and_frequency_not_spacing(self):
        units = {0: [1, 2], 1: [2, 2, 3], 2: [1, 3], 3: [3, 3]}
        mapping = {1: -100, 2: 0, 3: 0.01}
        rescaled = {item: [mapping[value] for value in responses] for item, responses in units.items()}
        self.assertEqual(
            metrics.krippendorff_alpha(units, metrics.ORDINAL),
            metrics.krippendorff_alpha(rescaled, metrics.ORDINAL),
        )

    def test_bootstrap_matches_reference_including_resampled_ordinal_marginals(self):
        units = {0: [0, 1], 1: [1, 1, 1], 2: [2, 4], 3: [0, 4, 4], 4: [4, 4]}
        for distance in (metrics.INTERVAL, metrics.ORDINAL):
            with self.subTest(distance=distance):
                expected = metrics.bootstrap_ci(lambda draw: pairwise_alpha(draw, distance), units, samples=100)
                actual = metrics.bootstrap_ci(
                    lambda draw: metrics.krippendorff_alpha(draw, distance), units, samples=100
                )
                self.assertIsNotNone(actual)
                for result, reference in zip(actual, expected):
                    self.assertAlmostEqual(result, reference, places=12)

    def test_full_numeric_bootstrap_does_not_construct_dense_matrices(self):
        units = {item: [float(item), item + 0.25] for item in range(300)}
        # Guard the cause of the regression without machine-dependent timing assertions.
        with (
            patch.object(metrics, "_coincidence", side_effect=AssertionError("dense coincidence matrix")),
            patch.object(metrics, "_delta", side_effect=AssertionError("dense distance matrix")),
        ):
            for distance in (metrics.INTERVAL, metrics.ORDINAL):
                with self.subTest(distance=distance):
                    interval = metrics.bootstrap_ci(lambda draw: metrics.krippendorff_alpha(draw, distance), units)
                    self.assertIsNotNone(interval)
                    self.assertTrue(all(isfinite(value) for value in interval))
                    self.assertLessEqual(interval[0], interval[1])
