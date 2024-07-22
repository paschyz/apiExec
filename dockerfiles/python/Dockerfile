# Utilisez une image de base officielle d'Ubuntu
FROM ubuntu:latest

# Installez Python
RUN apt-get update && apt-get install -y python3

# Créez un répertoire de travail
WORKDIR /app

# Copiez le script Python dans le répertoire de travail
COPY script.py /app

# Commande par défaut à exécuter lorsque le conteneur démarre
CMD ["python3", "script.py"]
