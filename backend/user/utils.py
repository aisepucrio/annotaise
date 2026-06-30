from django.core.mail import EmailMultiAlternatives
from django.conf import settings

INVITATION_EMAIL_TEMPLATES = {
    "pt-BR": {
        "subject": "[Annotaise] Sua conta foi criada - complete seu cadastro",
        "text": """
Você foi convidado para acessar a Annotaise como {invitation.role}.

Complete seu cadastro pelo link:
{link}

Se você não reconhece este convite, ignore este e-mail.
""",
        "html": """
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <p>Olá!</p>

    <p>
        Uma conta foi criada para o seu e-mail na
        <strong>Annotaise – Alse Labeling Platform</strong>.
    </p>

    <p>Aqui estão seus dados para iniciar:</p>

    <ul>
        <li><strong>E-mail:</strong> {invitation.email}</li>
        <li><strong>Papel:</strong> {invitation.role}</li>
    </ul>

    <p>
        Para ativar sua conta e definir sua senha, clique no link abaixo:
    </p>

    <p style="margin: 20px 0;">
        <a href="{link}" 
           style="background-color: #4A6CF7; 
                  color: white; 
                  padding: 12px 18px; 
                  text-decoration: none; 
                  border-radius: 6px;
                  font-weight: bold;">
            Ativar minha conta
        </a>
    </p>

    <p>
        Se você não reconhece este convite, basta ignorar este e-mail.
    </p>

    <br>

    <p style="font-size: 14px; color: #555;">
        Bem-vindo à plataforma Annotaise.
    </p>

    <div style="margin-top: 25px; text-align: center;">
        <img src="" alt="Annotaise Logo" width="280">
    </div>
</body>
</html>
""",
    },
    "en": {
        "subject": "[Annotaise] Your account was created - complete your registration",
        "text": """
You were invited to access Annotaise as {invitation.role}.

Complete your registration using this link:
{link}

If you do not recognize this invitation, ignore this email.
""",
        "html": """
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <p>Hello!</p>

    <p>
        An account was created for your email on
        <strong>Annotaise - Alse Labeling Platform</strong>.
    </p>

    <p>Here are your details to get started:</p>

    <ul>
        <li><strong>Email:</strong> {invitation.email}</li>
        <li><strong>Role:</strong> {invitation.role}</li>
    </ul>

    <p>
        To activate your account and set your password, click the link below:
    </p>

    <p style="margin: 20px 0;">
        <a href="{link}" 
           style="background-color: #4A6CF7; 
                  color: white; 
                  padding: 12px 18px; 
                  text-decoration: none; 
                  border-radius: 6px;
                  font-weight: bold;">
            Activate my account
        </a>
    </p>

    <p>
        If you do not recognize this invitation, you can ignore this email.
    </p>

    <br>

    <p style="font-size: 14px; color: #555;">
        Welcome to the Annotaise platform.
    </p>

    <div style="margin-top: 25px; text-align: center;">
        <img src="" alt="Annotaise Logo" width="280">
    </div>
</body>
</html>
""",
    },
}

DEFAULT_INVITATION_EMAIL_LANGUAGE = "pt-BR"
SUPPORTED_INVITATION_EMAIL_LANGUAGES = tuple(INVITATION_EMAIL_TEMPLATES.keys())


def get_invitation_email_template(language):
    return INVITATION_EMAIL_TEMPLATES.get(
        language,
        INVITATION_EMAIL_TEMPLATES[DEFAULT_INVITATION_EMAIL_LANGUAGE],
    )


def send_invitation_email(invitation, link, language=DEFAULT_INVITATION_EMAIL_LANGUAGE):
    template = get_invitation_email_template(language)
    subject = template["subject"]
    text_message = template["text"].format(invitation=invitation, link=link)
    html_message = template["html"].format(invitation=invitation, link=link)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invitation.email],
    )
    msg.attach_alternative(html_message, "text/html")
    msg.send(fail_silently=False)
