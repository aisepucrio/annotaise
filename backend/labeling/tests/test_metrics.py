"""Regression tests for numeric alpha, independently of Django or a database."""

from collections import Counter
from math import isfinite
from random import Random
from unittest import TestCase
from unittest.mock import patch

from ..services import metrics


PERFECT_AGREEMENT = 1.0


def squared_distance(left, right, distance, rating_counts):
    """Krippendorff's delta^2 between two ratings.

    Interval: plain squared difference.
    Ordinal: squared count of ratings spanning left..right, counting the two
    endpoints at half weight (so only order and frequency matter, not spacing).
    """
    if distance == metrics.Distance.INTERVAL:
        return (left - right) ** 2
    if left == right:
        return 0.0
    low, high = sorted((left, right))
    ratings_between = sum(count for value, count in rating_counts.items() if low < value < high)
    half_endpoints = (rating_counts[low] + rating_counts[high]) / 2
    return (ratings_between + half_endpoints) ** 2


def sum_of_pair_distances(ratings, distance, rating_counts):
    """Distance summed over every ordered pair (a, b) of the given ratings."""
    return sum(squared_distance(a, b, distance, rating_counts) for a in ratings for b in ratings)


def pairwise_alpha(units, distance):
    """Slow reference straight from the textbook definition, to check the fast one.

    alpha = 1 - observed_disagreement / expected_disagreement
      observed: average distance between ratings given to the SAME item.
      expected: average distance between ANY two ratings (what chance would give).
    1 = perfect agreement, 0 = no better than chance, < 0 = worse than chance.
    """
    items = [ratings for ratings in units.values() if len(ratings) >= 2]
    all_ratings = [rating for ratings in items for rating in ratings]
    if not all_ratings:
        return None
    rating_counts = Counter(all_ratings)
    total = len(all_ratings)

    expected_disagreement = sum_of_pair_distances(all_ratings, distance, rating_counts) / (total * (total - 1))
    if expected_disagreement == 0:
        return PERFECT_AGREEMENT

    # Each item is weighted by 1 / (raters - 1) so items with more raters don't dominate.
    observed_disagreement = sum(
        sum_of_pair_distances(ratings, distance, rating_counts) / (len(ratings) - 1) for ratings in items
    ) / total
    return 1 - observed_disagreement / expected_disagreement


class NumericAlphaTest(TestCase):
    def test_matches_pairwise_definition_with_ragged_panels_and_ties(self):
        rng = Random(1729)
        for sample in range(30):
            units = {
                item: [rng.choice([-3.5, -1.0, 0.0, 2.25, 8.0]) for _ in range(rng.randrange(6))]
                for item in range(12)
            }
            for distance in (metrics.Distance.INTERVAL, metrics.Distance.ORDINAL):
                with self.subTest(sample=sample, distance=distance):
                    self.assertAlmostEqual(
                        metrics.krippendorff_alpha(units, distance), pairwise_alpha(units, distance), places=12
                    )

    def test_matches_pairwise_definition_with_distinct_continuous_values(self):
        rng = Random(42)
        units = {item: [rng.uniform(-20, 20) for _ in range(2 + item % 4)] for item in range(15)}
        for distance in (metrics.Distance.INTERVAL, metrics.Distance.ORDINAL):
            with self.subTest(distance=distance):
                self.assertAlmostEqual(
                    metrics.krippendorff_alpha(units, distance), pairwise_alpha(units, distance), places=12
                )

    def test_empty_and_single_rating_items_are_excluded(self):
        comparable = {0: [0, 1], 1: [2, 2, 3]}
        with_missing = comparable | {2: [], 3: [-1000], 4: [1000]}
        for distance in (metrics.Distance.INTERVAL, metrics.Distance.ORDINAL):
            with self.subTest(distance=distance):
                self.assertIsNone(metrics.krippendorff_alpha({}, distance))
                self.assertIsNone(metrics.krippendorff_alpha({0: [], 1: [1]}, distance))
                self.assertEqual(
                    metrics.krippendorff_alpha(with_missing, distance),
                    metrics.krippendorff_alpha(comparable, distance),
                )

    def test_perfect_agreement_and_constant_values(self):
        for distance in (metrics.Distance.INTERVAL, metrics.Distance.ORDINAL):
            for units in ({0: [4, 4]}, {0: [4, 4], 1: [4, 4, 4]}, {0: [1, 1], 1: [5, 5, 5]}):
                with self.subTest(distance=distance, units=units):
                    self.assertEqual(metrics.krippendorff_alpha(units, distance), 1.0)

    def test_negative_alpha_is_preserved(self):
        for distance in (metrics.Distance.INTERVAL, metrics.Distance.ORDINAL):
            with self.subTest(distance=distance):
                self.assertAlmostEqual(metrics.krippendorff_alpha({0: [0, 1], 1: [0, 1]}, distance), -0.5)
                self.assertAlmostEqual(metrics.krippendorff_alpha({0: [0, 1]}, distance), 0.0)

    def test_interval_alpha_is_stable_at_large_offsets(self):
        units = {0: [0.0, 0.25], 1: [0.5, 1.0, 1.25], 2: [2.0, 2.0]}
        shifted = {item: [1e12 + value for value in responses] for item, responses in units.items()}
        expected = pairwise_alpha(units, metrics.Distance.INTERVAL)
        self.assertAlmostEqual(metrics.krippendorff_alpha(shifted, metrics.Distance.INTERVAL), expected, places=12)

    def test_ordinal_alpha_depends_on_order_and_frequency_not_spacing(self):
        units = {0: [1, 2], 1: [2, 2, 3], 2: [1, 3], 3: [3, 3]}
        mapping = {1: -100, 2: 0, 3: 0.01}
        rescaled = {item: [mapping[value] for value in responses] for item, responses in units.items()}
        self.assertEqual(
            metrics.krippendorff_alpha(units, metrics.Distance.ORDINAL),
            metrics.krippendorff_alpha(rescaled, metrics.Distance.ORDINAL),
        )

    def test_bootstrap_matches_reference_including_resampled_ordinal_marginals(self):
        units = {0: [0, 1], 1: [1, 1, 1], 2: [2, 4], 3: [0, 4, 4], 4: [4, 4]}
        for distance in (metrics.Distance.INTERVAL, metrics.Distance.ORDINAL):
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
            for distance in (metrics.Distance.INTERVAL, metrics.Distance.ORDINAL):
                with self.subTest(distance=distance):
                    interval = metrics.bootstrap_ci(lambda draw: metrics.krippendorff_alpha(draw, distance), units)
                    self.assertIsNotNone(interval)
                    self.assertTrue(all(isfinite(value) for value in interval))
                    self.assertLessEqual(interval[0], interval[1])
