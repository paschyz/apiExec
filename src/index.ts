import express, { Request, Response } from 'express';
import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const docker = new Docker();
const app = express();
const PORT = 3001;

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

app.get('/download', (req, res) => {
    const filePath = path.join(__dirname,"file.txt"); // or any file format
         res.download(filePath);
         res.status(201).json("ok")
});

const getMimeType = (fileExtension: string | number) => {
    const mimeTypes: { [key: string]: string } = {
        'txt': 'text/plain',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'py': 'text/x-python',
        'js': 'application/javascript',
        'pdf': 'application/pdf',  // Ajouter des types MIME supplémentaires si nécessaire
        'zip': 'application/zip'
    };
    return mimeTypes[fileExtension] || 'application/octet-stream'; // Retourne 'application/octet-stream' par défaut
};
function writeCodeToFile(code: string, filePath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        // Ensure the directory exists
        const dir = path.dirname(filePath);

            // Write the file
            fs.writeFile(filePath, code, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
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

const cleanupFiles = async (hostCodeFilePath: string, hostFilePath?: string): Promise<void> => {
    const cleanupPromises = [deleteFile(hostCodeFilePath)];
    if (hostFilePath) {
        cleanupPromises.push(deleteFile(hostFilePath));
    }
    try {
        await Promise.all(cleanupPromises);
    } catch (cleanupError) {
        console.error('Erreur lors du nettoyage:', cleanupError);
    }
};
// Route pour exécuter le code
app.post('/execute', upload.single('file'), async (req: Request, res: Response) => 
 {
        const { language, code, outputFileType } = req.body;
        const file = req.file as Express.Multer.File | undefined;
    
        // Vérifiez que le langage est pris en charge
        const langConfig = LANGUAGES[language as string];
        if (!langConfig) {
            res.status(400).send('Unsupported language');
            return;
        }
    
        const containerName = `code-exec-container-${language}`;
        const codeFileName = `script.${langConfig.extension}`;
        const hostCodeFilePath = path.join(__dirname, codeFileName);
        const containerCodeFilePath = `/app/${codeFileName}`;
        const hostFilePath = file ? path.join(__dirname, 'uploads', file.filename) : undefined;
        const containerFilePath = file ? `/app/${file.originalname}` : undefined;
    
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
            const binds = [`${hostCodeFilePath}:${containerCodeFilePath}`];
            if (file) {
                binds.push(`${hostFilePath}:${containerFilePath}`);
            }
    
            container = await docker.createContainer({
                Image: langConfig.image,
                Cmd: langConfig.cmd(containerCodeFilePath),
                name: containerName,
                Tty: true,
                HostConfig: {
                    Binds: binds
                },
                AttachStdout: true,
                AttachStderr: true
            });
            await container.start();
    
            // Obtenez les logs du conteneur
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                follow: true
            });
    
            // Vérifiez si outputFileType est spécifié
            if (outputFileType !== "void") {
                try {
                    // Attendre que le conteneur s'arrête
                    await container.wait();
                    
                    const fileName = "output." + outputFileType;
                    const containerPath = `/app/${fileName}`; // Chemin du fichier dans le conteneur
    
                    // Obtenir le fichier depuis le conteneur
                    const stream = await container.getArchive({ path: containerPath });
    
                    // Envoyer le fichier en streaming à l'utilisateur
                    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
                    const mimeType = getMimeType(outputFileType);
                    res.setHeader('Content-Type', mimeType);
    
                    // Pipe le flux de données vers la réponse HTTP
                    stream.pipe(res);
    
    
                    stream.on('error', async (err: any) => {
                        console.error('Erreur lors de l\'envoi du fichier:', err);
                        res.status(500).send('Erreur lors de l\'envoi du fichier.');
                        // Nettoyage des fichiers en cas d'erreur
                    });
                } catch (error) {
                    console.error('Erreur lors de la récupération du fichier depuis le conteneur:', error);
                    res.status(500).send('Erreur lors de la récupération du fichier.');
                    // Nettoyage des fichiers en cas d'erreur
                }
            } else {
                // Si outputFileType n'est pas spécifié, envoyez les logs en réponse
                res.set('Content-Type', 'text/plain');
                logs.on('data', (chunk: Buffer) => {
                    res.write(chunk.toString());
                });
                logs.on('end', async () => {
                    res.end();
                    // Nettoyage des fichiers après l'envoi de la réponse
                });
            }
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).send('An error occurred while fetching the logs.');
            // Nettoyage des fichiers en cas d'erreur
            await cleanupFiles(hostCodeFilePath, hostFilePath);
        }
    });



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
