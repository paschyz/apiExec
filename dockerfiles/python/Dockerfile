# Utilisez une image de base officielle d'Ubuntu
FROM ubuntu:latest

# Installez Python, pip, et les dépendances nécessaires
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv \
    build-essential libjpeg-dev zlib1g-dev \
    libfreetype6-dev liblcms2-dev libtiff5-dev \
    libffi-dev libxml2-dev libxslt1-dev \
    libsqlite3-dev && \
    apt-get clean

# Créez et activez un environnement virtuel
RUN python3 -m venv /opt/venv

# Assurez-vous que l'environnement virtuel est utilisé
ENV PATH="/opt/venv/bin:$PATH"

# Installez les bibliothèques Python nécessaires dans l'environnement virtuel
RUN pip install --upgrade pip && \
    pip install pillow numpy matplotlib requests beautifulsoup4

# Créez un répertoire de travail
WORKDIR /app
