const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config(); // Cargar variables desde el archivo .env

const app = express();
const PORT = process.env.PORT || 3000; // Usar el puerto definido en .env o 3000 por defecto

// Configuración para manejar subida de archivos usando multer
const upload = multer({ dest: 'uploads/' }); // Almacena los archivos subidos en la carpeta 'uploads'

// ID de la carpeta en Google Drive
const GOOGLE_API_FOLDER_ID = process.env.GOOGLE_API_FOLDER_ID;

async function uploadFileToGoogleDrive(filePath, fileName) {
    try {
        // Autenticación usando credenciales en formato JSON desde la variable de entorno
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const driveService = google.drive({
            version: 'v3',
            auth,
        });

        const fileMetaData = {
            name: fileName,
            parents: [GOOGLE_API_FOLDER_ID],
        };

        const media = {
            mimeType: 'image/jpg', // Cambia esto si deseas soportar otros tipos de archivo
            body: fs.createReadStream(filePath),
        };

        const response = await driveService.files.create({
            resource: fileMetaData,
            media: media,
            fields: 'id',
        });

        // Eliminar el archivo temporal después de subirlo
        fs.unlinkSync(filePath);

        return response.data.id;
    } catch (err) {
        console.error('Error al subir el archivo:', err);
        throw err;
    }
}

// Ruta para subir archivos
app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send({ error: 'No se subió ningún archivo' });
    }

    try {
        const fileId = await uploadFileToGoogleDrive(file.path, file.originalname);
        res.status(200).send({
            message: 'Archivo subido con éxito',
            fileId: fileId,
            link: `https://drive.google.com/uc?export=view&id=${fileId}`,
        });
    } catch (err) {
        res.status(500).send({ error: 'Error al subir el archivo' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
