import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import admin from 'firebase-admin'

dotenv.config();
const app = express();
const PORT = process.env.PORT || 2000;
const uri = process.env.DB;

app.use(cors());
app.use(express.json());

admin.initializeApp({
    credential: admin.credential.cert({
        type: process.env.TYPE,
        project_id: process.env.FB_PROJECT_ID,
        private_key_id: process.env.FB_PRIVATE_KEY_ID,
        private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FB_CLIENT_EMAIL,
        client_id: process.env.FB_CLIENT_ID,
        auth_uri: process.env.FB_AUTH_URI,
        token_uri: process.env.FB_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL,
        universe_domain: process.env.FB_UNIVERSE_DOMAIN,
    })
});

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) return res.status(401).send("Unauthorized Access");
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        if (!decoded.email) return res.status(401).send("Unauthorized Access");
        if (decoded.email !== req.params.email) return res.status(403).send("Forbidden access");
        next();
    } catch (err) {
        console.error(err);
        res.status(401).send("Unauthorized Access");
    }
}

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
    const result = await db.collection("foods").find({ status: "available" }).sort({ expire_date: -1 }).limit(6).toArray()
    res.send(result)
})

//  Private api
app.get("/foods", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").find({ status: "available" }).toArray()
    res.send(result)
})
app.get("/my-foods/:email", verifyToken, async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").find({ donator_email: req.params.email }).toArray()
    res.send(result)
})
app.get("/foods/:id", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").findOne({ _id: new ObjectId(req.params.id) })
    res.send(result)
})
app.get("/food-requests/:id", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("food-requests").find({ food_id: req.params.id }).toArray()
    res.send(result)
})
app.put("/donate-foods/:id", async (req, res) => {
    const db = await connectDB()
    const check = await db.collection("foods").findOne({ _id: new ObjectId(req.body.foodId) })
    if (check.status.toLowerCase() === "donated") {
        res.send("Proccess unsuccessful, because this food is already donated.")
    } else {
        const result = await db.collection("foods").updateOne({ _id: new ObjectId(req.body.foodId) }, { $set: { status: "donated" } })
        if(result.acknowledged) {
        const request = await db.collection("food-requests").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: "accepted" } })
        res.send(request)
        } else res.send("Something went wrong!")
    }
})
app.delete("/delete-request/:id", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("food-requests").deleteOne({ _id: new ObjectId(req.params.id) })
    res.send(result)
})

app.post("/create-food", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").insertOne(req.body)
    res.send(result)
})
app.post("/request-food", async (req, res) => {
    const db = await connectDB()
    const food = await db.collection("foods").findOne({ _id: new ObjectId(req.body.food_id) })
    if (food.status.toLowerCase() === "available") {
        const result = await db.collection("food-requests").insertOne(req.body)
        res.send(result)
    } else res.send("Food is not Available")
})
app.put("/update-food/:id", async (req, res) => {
    const db = await connectDB()
    const result = await db.collection("foods").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body })
    res.send(result)
})

app.listen(PORT, () =>
    console.log(`server running on port: ${PORT}`)
)