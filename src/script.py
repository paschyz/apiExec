import sys

# Chemin du fichier à lire (passé en argument de la ligne de commande)
input_file_path = '/app/txt.txt'

try:
    # Lire le contenu du fichier
    with open(input_file_path, 'r') as file:
        content = file.read()

    # Traitement du contenu (ici, juste pour démonstration)
    print(f"Content of the file:\n{content}")

    # Écrire le contenu dans un nouveau fichier
    output_file_path = '/app/output.txt'
    with open(output_file_path, 'w') as file:
        file.write(content)

except Exception as e:
    print(f"An error occurred: {e}", file=sys.stderr)
