import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 2000;
const uri = process.env.DB;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    },
});

let cachedDB = null;
async function connectDB() {
    try {
        if (cachedDB) return cachedDB;
        await client.connect();
        cachedDB = client.db("Plate_Share");
        return cachedDB;
    } catch (err) {
        console.error("Error from DB : ", err)
    }
}

//  Public api
app.get("/", (req, res) => res.send("Server is getting!"));

app.get("/kk", async (req, res) => {
    const db = await connectDB();
    const result = await db.collection("foods").insertOne({name: "Biriyani", price: 120});
    res.send(result);
})

app.listen(PORT, () =>
    console.log(`server running on port: ${PORT}`)
);