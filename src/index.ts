const express = require('express');
const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const docker = new Docker();
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const LANGUAGES: { [key: string]: { extension: string; image: string; cmd: (filePath: any) => any[] } } = {
    python: {
        extension: 'py',
        image: 'my-python-image',
        cmd: (filePath: any) => ['python3', filePath]
    },
    javascript: {
        extension: 'js',
        image: 'my-node-image',
        cmd: (filePath: any) => ['node', filePath]
    }
};

// Fonction pour écrire le code dans un fichier
function writeCodeToFile(code: any, filePath: any) {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(filePath, code, (err: any) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

app.post('/execute', async (req:any, res:any) => {
    const { language, code } = req.body;
    const langConfig = LANGUAGES[language];

    if (!langConfig) {
        return res.status(400).send('Unsupported language');
    }

    try {
        const containerName = `code-exec-container-${language}`;
        const codeFileName = `script.${langConfig.extension}`;
        const hostCodeFilePath = path.join(__dirname, codeFileName);
        const containerCodeFilePath = `/app/${codeFileName}`;

        // Écrire le code dans un fichier sur l'hôte
        await writeCodeToFile(code, hostCodeFilePath);

        // Vérifiez si le conteneur est déjà en cours d'exécution
        let container = docker.getContainer(containerName);
        const containerInfo = await container.inspect().catch(() => null);

        if (containerInfo) {
            // Arrêter et supprimer le conteneur s'il existe
            await container.stop().catch(() => null);
            await container.remove();
        }

        // Créez et démarrez le conteneur avec le fichier monté
        container = await docker.createContainer({
            Image: langConfig.image,
            Cmd: langConfig.cmd(containerCodeFilePath),
            name: containerName,
            Tty: true,
            HostConfig: {
                Binds: [`${hostCodeFilePath}:${containerCodeFilePath}`]
            }
        });
        await container.start();

        // Obtenez les logs du conteneur
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            follow: true
        });

        // Envoyer les logs en réponse
        res.set('Content-Type', 'text/plain');
        logs.on('data', (chunk: { toString: () => any; }) => {
            res.write(chunk.toString());
        });
        logs.on('end', () => {
            res.end();
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while fetching the logs.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
