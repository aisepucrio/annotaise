from django.core.mail import EmailMultiAlternatives
from django.conf import settings

def send_invitation_email(invitation, link):
    subject = "[Annotaise] Sua conta foi criada – complete seu cadastro"

    text_message = f"""
Você foi convidado para acessar a Annotaise como {invitation.role}.

Complete seu cadastro pelo link:
{link}

Se você não reconhece este convite, ignore este e-mail.
"""

    html_message = f"""
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
"""

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invitation.email],
    )
    msg.attach_alternative(html_message, "text/html")
    msg.send()
