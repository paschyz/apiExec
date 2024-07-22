const express = require('express');
const Docker = require('dockerode');
const docker = new Docker();
const fs = require('fs')
const app = express();
const PORT = 3000;
const codeToExecute = `
print("Hello from the dynamically created script!")
`;

// Fonction pour écrire le code dans un fichier
function writeCodeToFile(code: any, filePath: any) {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(filePath, code, (err: any) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
app.get('/run-code', async (req:any, res:any) => {
    try {
        const containerName = 'my-python-container';
        
        // Vérifiez si le conteneur est déjà en cours d'exécution
        let container = docker.getContainer(containerName);
        const containerInfo = await container.inspect().catch(() => null);

        if (!containerInfo) {
            // Créez et démarrez le conteneur s'il n'existe pas ou n'est pas en cours d'exécution
            container = await docker.createContainer({
                Image: 'my-python',
                Cmd: ['python3', 'script.py'],
                name: containerName,
                Tty: true
            });
            await container.start();
        }

        // Obtenez les logs du conteneur
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            follow: false,
            tail: 100 // Obtenez les 100 dernières lignes de logs
        });

        res.set('Content-Type', 'text/plain');
        res.send(logs);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while fetching the logs.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
