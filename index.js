import express from "express";
import { MongoClient } from "mongodb";
import { engine } from "express-handlebars";
import slugify from "slugify";

// Express App
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create a MongoDB Client and connect to the Railway Instance
const client = new MongoClient(process.env.MONGO_URL);
await client.connect();

const db = client.db("project-manager");
const projects = db.collection("projects");

// Set the templating engine to Handlebars
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "views");

// Set the public dir as static files dir
app.use(express.static("public"));

// Home route handler
app.get("/", async (req, res) => {
    const docs = await projects.find().toArray();

    res.render("home", { docs });
});

// Single Project route handler
app.get("/project/:slug", async (req, res) => {
    const { slug } = req.params;
    const doc = await projects.findOne({ slug });
    doc.isDev = doc.stage === "development";
    doc.isStg = doc.stage === "staging";
    doc.isProd = doc.stage === "production";

    res.render("project", { ...doc });
});

// New Project route handler
app.get("/new", (req, res) => {
    res.render("new");
});

// Create Project route handler
app.post("/new", async (req, res) => {
    const slug = slugify(req.body.title, { lower: true });

    if (await projects.findOne({ slug })) {
        res.send("Project with this title already exists");
    } else {
        await projects.insertOne({
            ...req.body,
            slug,
            modified_at: new Date().toUTCString(),
        });
        res.redirect("/");
    }
});

// Update Project route handler
app.post("/update/:slug", async (req, res) => {
    await projects.updateOne(
        { slug: req.params.slug },
        {
            $set: {
                ...req.body,
                slug: slugify(req.body.title, { lower: true }),
                modified_at: new Date().toUTCString(),
            },
        }
    );

    res.redirect("/");
});

// Delete a Project
app.get("/deleteProject", async (req, res) => {
    const { title } = req.query;

    await projects.deleteOne({ title });

    res.redirect("/");
});

// Start listening to incoming requests
app.listen(3000, () =>
    console.log("Project Manager started listening on http://localhost:3000/")
);
