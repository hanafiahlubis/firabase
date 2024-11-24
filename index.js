// Import Firebase functions
import { initializeApp } from "firebase/app";
import admin from "firebase-admin"; // Admin SDK untuk Firebase
import multer from "multer"; // Middleware untuk menangani file upload
import path from "path"; // Untuk menangani path file
import express from "express";
import dotenv from "dotenv";
import { bucket, db, realtimeDb } from "./config/configDb.js";

dotenv.config();

const server = express();

// Middleware
server.use(express.json()); // Untuk parsing JSON di request body

// Setup Multer Middleware
const storage = multer.memoryStorage(); // Menggunakan penyimpanan di memori
const upload = multer({ storage });

// Routes
server.get("/", (req, res) => {
    res.send("Hello World! Express dengan Firebase siap digunakan.");
});

// Endpoint untuk Menyimpan Data
server.post("/add-user", async (req, res) => {
    try {
        const { name, email } = req.body;
        const userRef = db.collection("users").doc(); // Buat dokumen baru
        await userRef.set({
            name,
            email,
            createdAt: new Date().toISOString(),
        });
        res.status(200).send({ message: "User berhasil ditambahkan!", id: userRef.id });
    } catch (error) {
        res.status(500).send({ message: "Gagal menambahkan user", error: error.message });
    }
});

// Endpoint untuk Mengambil Data
server.get("/users", async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send({ message: "Gagal mendapatkan data", error: error.message });
    }
});

// Endpoint untuk Upload File
server.post("/upload", upload.single("gambar"), async (req, res) => {
    try {
        // File akan ada di req.file
        const file = req.file;

        if (!file) {
            return res.status(400).send({ message: "No file uploaded!" });
        }

        // Tentukan nama file dan path di dalam folder 'gambar/'
        const fileName = `${Date.now()}_${file.originalname}`;
        const filePath = `gambar/${fileName}`;

        // Upload file ke Firebase Storage di folder 'gambar/'
        const fileUpload = bucket.file(filePath);
        await fileUpload.save(file.buffer, {
            metadata: {
                contentType: file.mimetype,
            },
        });

        // Membuat URL untuk file yang diupload
        const [url] = await fileUpload.getSignedUrl({
            action: "read",
            expires: "03-01-2030", // URL berlaku hingga 2030
        });

        // Respons sukses
        res.status(200).send({
            message: "File uploaded successfully!",
            fileName,
            fileUrl: url,
        });
    } catch (error) {
        res.status(500).send({
            message: "Gagal mengupload file",
            error: error.message,
        });
    }
});

// Endpoint untuk Menambah Data ke Realtime Database
server.post("/add-data", async (req, res) => {
    try {
        const { table_name, data } = req.body;

        if (!table_name || !data) {
            return res.status(400).send({ message: "Nama tabel dan data diperlukan!" });
        }

        // Referensi ke tabel di Realtime Database
        const ref = realtimeDb.ref(table_name);

        // Push data ke tabel
        const newRecordRef = ref.push();
        await newRecordRef.set(data);

        res.status(200).send({
            message: "Data berhasil ditambahkan!",
            table_name,
            id: newRecordRef.key, // ID unik dari data yang baru ditambahkan
        });
    } catch (error) {
        res.status(500).send({
            message: "Gagal menambahkan data",
            error: error.message,
        });
    }
});

server.get("/get-data/:table_name", async (req, res) => {
    try {
        const { table_name } = req.params;

        if (!table_name) {
            return res.status(400).send({ message: "Nama tabel diperlukan!" });
        }

        const ref = realtimeDb.ref(table_name);
        const snapshot = await ref.once("value");

        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Data tidak ditemukan!" });
        }

        res.status(200).send(snapshot.val());
    } catch (error) {
        res.status(500).send({
            message: "Gagal mengambil data",
            error: error.message,
        });
    }
});

server.get("/get-data-by-id/:table_name/:id", async (req, res) => {
    try {
        const { table_name, id } = req.params;

        if (!table_name || !id) {
            return res.status(400).send({ message: "Nama tabel dan ID diperlukan!" });
        }

        const ref = realtimeDb.ref(`${table_name}/${id}`);
        const snapshot = await ref.once("value");

        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Data tidak ditemukan!" });
        }

        res.status(200).send(snapshot.val());
    } catch (error) {
        res.status(500).send({
            message: "Gagal mengambil data berdasarkan ID",
            error: error.message,
        });
    }
});

server.put("/update-data/:table_name/:id", async (req, res) => {
    try {
        const { table_name, id } = req.params;
        const { data } = req.body;

        if (!table_name || !id || !data) {
            return res.status(400).send({ message: "Nama tabel, ID, dan data diperlukan!" });
        }

        const ref = realtimeDb.ref(`${table_name}/${id}`);
        const snapshot = await ref.once("value");

        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Data tidak ditemukan!" });
        }

        await ref.update(data);

        res.status(200).send({ message: "Data berhasil diperbarui!" });
    } catch (error) {
        res.status(500).send({
            message: "Gagal memperbarui data",
            error: error.message,
        });
    }
});

server.delete("/delete-data/:table_name/:id", async (req, res) => {
    try {
        const { table_name, id } = req.params;

        if (!table_name || !id) {
            return res.status(400).send({ message: "Nama tabel dan ID diperlukan!" });
        }

        const ref = realtimeDb.ref(`${table_name}/${id}`);
        const snapshot = await ref.once("value");

        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Data tidak ditemukan!" });
        }

        await ref.remove();

        res.status(200).send({ message: "Data berhasil dihapus!" });
    } catch (error) {
        res.status(500).send({
            message: "Gagal menghapus data",
            error: error.message,
        });
    }
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
