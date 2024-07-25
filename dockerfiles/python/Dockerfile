# Utilisez une image de base officielle d'Ubuntu
FROM ubuntu:latest

# Installez Python, pip et les dépendances nécessaires
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    apt-get clean

# Créez et activez un environnement virtuel
RUN python3 -m venv /opt/venv

# Assurez-vous que l'environnement virtuel est utilisé
ENV PATH="/opt/venv/bin:$PATH"

# Installez Pillow dans l'environnement virtuel
RUN pip install pillow

# Créez un répertoire de travail
WORKDIR /app