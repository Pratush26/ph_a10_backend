import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

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
        cachedDB = client.db("Plate_Share")
        return cachedDB;
    } catch (err) {
        console.error("Error from DB : ", err)
    }
}

//  Public api
app.get("/", (req, res) => res.send("Server is getting!"))
app.get("/featured-foods", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").find().sort({expire_date : -1}).limit(6).toArray()
    res.send(result)
})

//  Private api
app.get("/foods", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").find().toArray()
    res.send(result)
})
app.get("/foods/:id", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").findOne({_id : new ObjectId(req.params.id)})
    res.send(result)
})
app.post("/create-food", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").insertOne(req.body)
    res.send(result)
})
app.put("/update-food/:id", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body })
    res.send(result)
})

app.listen(PORT, () =>
    console.log(`server running on port: ${PORT}`)
)