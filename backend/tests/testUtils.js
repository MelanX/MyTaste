const express = require("express");
const jwt = require("jsonwebtoken");
const authRouter = require("../routes/auth");
const bringRouter = require("../routes/bring");
const recipesRouter = require("../routes/recipes");
const importRouter = require("../routes/import");
const uploadRouter = require("../routes/upload");
const configRouter = require("../routes/config");

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/api",
        authRouter,
        bringRouter,
        recipesRouter,
        importRouter,
        uploadRouter,
        configRouter
    );
    // mimic your global error handler
    app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
    return app;
}

function authHeader() {
    const token = jwt.sign(
        { user: process.env.ADMIN_USER },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
    return { Authorization: `Bearer ${ token }` };
}

module.exports = { makeApp, authHeader };
