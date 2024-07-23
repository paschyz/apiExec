import express, { Request, Response } from 'express';
import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import bodyParser from 'body-parser';

const docker = new Docker();
const app = express();
const PORT = 3000;

const upload = multer({ dest: path.join(__dirname, 'uploads') });

interface LanguageConfig {
    extension: string;
    image: string;
    cmd: (filePath: string) => string[];
}

const LANGUAGES: { [key: string]: LanguageConfig } = {
    python: {
        extension: 'py',
        image: 'my-python-image',
        cmd: (filePath: string) => ['python3', filePath]
    },
    javascript: {
        extension: 'js',
        image: 'my-node-image',
        cmd: (filePath: string) => ['node', filePath]
    }
};

// Fonction pour écrire le code dans un fichier
function writeCodeToFile(code: string, filePath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(filePath, code, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
function deleteFile(filePath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
// Route pour exécuter le code
app.post('/execute', upload.single('file'), async (req: Request, res: Response) => {
    const { language, code } = req.body;
    const file = req.file as Express.Multer.File; // Type assertion

    // Vérifiez que le langage est pris en charge
    const langConfig = LANGUAGES[language as string];
    if (!langConfig) {
        return res.status(400).send('Unsupported language');
    }

    // Vérifiez que le fichier a bien été téléchargé
    if (!file) {
        return res.status(400).send('No file uploaded');
    }
    const containerName = `code-exec-container-${language}`;
    const codeFileName = `script.${langConfig.extension}`;
    const hostCodeFilePath = path.join(__dirname, codeFileName);
    const containerCodeFilePath = `/app/${codeFileName}`;
    const hostFilePath = path.join(__dirname, 'uploads', file.filename);
    const containerFilePath = `/app/${file.originalname}`;
    try {


        // Écrire le code dans un fichier sur l'hôte
        await writeCodeToFile(code as string, hostCodeFilePath);

        // Vérifiez si le conteneur est déjà en cours d'exécution
        let container = docker.getContainer(containerName);
        const containerInfo = await container.inspect().catch(() => null);

        if (containerInfo) {
            // Arrêter et supprimer le conteneur s'il existe
            await container.stop().catch(() => null);
            await container.remove();
        }

        // Créez et démarrez le conteneur avec les fichiers montés
        container = await docker.createContainer({
            Image: langConfig.image,
            Cmd: langConfig.cmd(containerCodeFilePath),
            name: containerName,
            Tty: true,
            HostConfig: {
                Binds: [
                    `${hostFilePath}:${containerFilePath}`,
                    `${hostCodeFilePath}:${containerCodeFilePath}`
                ]
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
        logs.on('data', (chunk: Buffer) => {
            res.write(chunk.toString());
        });
        logs.on('end', () => {
            res.end();
            Promise.all([
                deleteFile(path.join(__dirname, '/uploads', file.filename)),
                deleteFile(hostCodeFilePath)
            ]).catch(cleanupError => {
                console.error('Error during cleanup:', cleanupError);
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while fetching the logs.');
    } 
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
