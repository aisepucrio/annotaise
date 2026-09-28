from django.contrib.auth import get_user_model

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

    user = User.objects.create(
        username=LLM_TIEBREAK_USERNAME,
        email=LLM_TIEBREAK_EMAIL,
        first_name="LLM",
        last_name="TieBreak",
        account_type="standard",
        is_active=True,
        onboarding_status="active",
    )
    user.set_unusable_password()
    user.save(update_fields=["password"])
    return user
