# Utilisez une image de base pour Debian
FROM debian:bullseye-slim

# Installez les dépendances nécessaires
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    nodejs \
    npm \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configurez Node.js (assurez-vous que la version est correcte)
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Créez un répertoire de travail
WORKDIR /app

# Copiez les scripts dans le conteneur
COPY . /app

# Par défaut, exécutez Python (modifiez cette ligne en fonction de ce que vous voulez exécuter)
CMD ["python3", "code.py"]
