from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

from common.constants import LLM_TIEBREAK_EMAIL, LLM_TIEBREAK_USERNAME


def get_or_create_tiebreak_bot():
    User = get_user_model()

    user = User.objects.filter(username=LLM_TIEBREAK_USERNAME).first()
    if user:
        return user

    user = User.objects.filter(email__iexact=LLM_TIEBREAK_EMAIL).first()
    if user:
        if not user.username:
            user.username = LLM_TIEBREAK_USERNAME
            user.save(update_fields=["username"])
        return user

    # get_or_create repeats the lookup on IntegrityError, so two tiebreaks racing
    # to create the bot both end up with the same row instead of one failing.
    user, _ = User.objects.get_or_create(
        username=LLM_TIEBREAK_USERNAME,
        defaults={
            "email": LLM_TIEBREAK_EMAIL,
            "first_name": "LLM",
            "last_name": "TieBreak",
            "account_type": "standard",
            "is_active": True,
            "onboarding_status": "active",
            "password": make_password(None),
        },
    )
    return user
