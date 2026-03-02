from django.db import models
from django.contrib.auth import get_user_model
import secrets
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class PasswordResetToken(models.Model):
   user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
   token = models.CharField(max_length=64, unique=True)
   created_at = models.DateTimeField(auto_now_add=True)
   used = models.BooleanField(default=False)

   def save(self, *args, **kwargs):
       if not self.token:
           self.token = secrets.token_urlsafe(32)
       super().save(*args, **kwargs)

   def is_valid(self):
       expiry = self.created_at + timedelta(hours=2)
       return not self.used and timezone.now() < expiry

   def __str__(self):
       return f"Reset token for {self.user.email}"
