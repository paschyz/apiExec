const fs = require('fs');
const path = require('path');

// Chemin du fichier texte d'entrée et de sortie
const inputFilePath = '/app/txt.txt';
const outputFilePath = '/app/output.txt';

// Fonction pour lire le fichier, transformer le texte et écrire dans un nouveau fichier
function processTextFile() {
    fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }

        // Convertir chaque ligne en majuscules
        const processedData = data.split('\n').map(line => line.toUpperCase()).join('\n');

        // Écrire le résultat dans un nouveau fichier
        fs.writeFile(outputFilePath, processedData, (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return;
            }

            console.log(processedData);
        });
    });
}

// Appeler la fonction pour traiter le fichier
processTextFile();
