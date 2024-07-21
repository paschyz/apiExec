const express = require('express')
const path = require('path');
const fs = require('fs')
const Docker = require('dockerode')
const app = express();
const multer = require('multer')
const upload = multer({ dest: 'uploads/' });
const docker = new Docker();

app.use(express.json());

app.post('/run-code', upload.single('inputFile'), async (req, res) => {
    const { language, code, outputFileType } = req.body;
    const inputFile = req.file ? req.file.path : null;

    if (!language || !code || !outputFileType) {
        return res.status(400).json({ error: 'Language, code, and outputFileType are required.' });
    }

    const codeFileName = `code.${language}`;
    const codeFilePath = path.join('uploads', codeFileName);
    fs.writeFileSync(codeFilePath, code);

    // Utilisez une seule image Docker avec les deux environnements
    const dockerImage = 'my-python-node-image'; 

    try {
        // Créez un conteneur Docker
        const container = await docker.createContainer({
            Image: dockerImage,
            Cmd: language === 'python' ? ['python3', codeFileName] : ['node', codeFileName],
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Volumes: {
                '/app': {}
            },
            HostConfig: {
                Binds: [`${path.resolve('uploads')}:/app`]
            }
        });

        await container.start();
        const logs = await container.logs({ stdout: true, stderr: true, follow: true });
        logs.pipe(process.stdout); // Affichez les logs pour le débogage

        const containerInspect = await container.inspect();
        const containerOutputPath = '/app/output.' + outputFileType;
        const outputFilePath = path.join('uploads', 'output.' + outputFileType);

        // Assurez-vous que le conteneur a généré le fichier de sortie
        fs.renameSync(containerOutputPath, outputFilePath);

        // Enregistrez le résultat
        const result = fs.readFileSync(outputFilePath);

        res.setHeader('Content-Type', `application/${outputFileType}`);
        res.send(result);

        // Nettoyez les fichiers temporaires
        fs.unlinkSync(codeFilePath);
        if (inputFile) fs.unlinkSync(inputFile);
        fs.unlinkSync(outputFilePath);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT =  3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
