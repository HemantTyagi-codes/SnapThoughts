const express = require("express");
const app = express();

const userModel = require("./models/user");
const postModel = require("./models/post");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



// ================= HOME =================

app.get("/", (req, res) => {
    res.render("index");
});



// ================= LOGIN PAGE =================

app.get("/login", (req, res) => {
    res.render("login");
});



// ================= REGISTER =================

app.post("/register", async (req, res) => {

    let { username, name, age, email, password } = req.body;

    let existingUser = await userModel.findOne({ email });

    if (existingUser) {
        return res.send("User already exists");
    }

    bcrypt.hash(password, 10, async (err, hash) => {

        let user = await userModel.create({
            username,
            name,
            age,
            email,
            password: hash
        });

        let token = jwt.sign(
            {
                email: user.email,
                userid: user._id
            },
            "hemant"
        );

        res.cookie("token", token);

        res.redirect("/profile");
    });
});



// ================= LOGIN =================

app.post("/login", async (req, res) => {

    let { email, password } = req.body;

    let user = await userModel.findOne({ email });

    if (!user) {
        return res.send("User not found");
    }

    bcrypt.compare(password, user.password, (err, result) => {

        if (result) {

            let token = jwt.sign(
                {
                    email: user.email,
                    userid: user._id
                },
                "hemant"
            );

            res.cookie("token", token);

            res.redirect("/profile");

        } else {
            res.send("Wrong password");
        }
    });
});



// ================= LOGOUT =================

app.get("/logout", (req, res) => {

    res.clearCookie("token");

    res.redirect("/login");
});



// ================= PROFILE =================

app.get("/profile", isLoggedIn, async (req, res) => {

    let user = await userModel
        .findOne({ email: req.user.email })
        .populate("post");

    res.render("profile", { user });
});



// ================= CREATE POST =================

app.post("/post", isLoggedIn, async (req, res) => {

    let user = await userModel.findOne({
        email: req.user.email
    });

    let post = await postModel.create({
        user: user._id,
        content: req.body.content
    });

    user.post.push(post._id);

    await user.save();

    res.redirect("/profile");
});



// ================= LIKE / UNLIKE =================

app.get("/like/:id", isLoggedIn, async (req, res) => {

    let post = await postModel.findById(req.params.id);

    let index = post.likes.indexOf(req.user.userid);

    if (index === -1) {

        post.likes.push(req.user.userid);

    } else {

        post.likes.splice(index, 1);
    }

    await post.save();

    res.redirect("/profile");
});



// ================= EDIT PAGE =================

app.get("/edit/:id", isLoggedIn, async (req, res) => {

    let post = await postModel.findById(req.params.id);

    res.render("edit", { post });
});



// ================= UPDATE POST =================

app.post("/update/:id", isLoggedIn, async (req, res) => {

    await postModel.findByIdAndUpdate(
        req.params.id,
        {
            content: req.body.content
        }
    );

    res.redirect("/profile");
});



// ================= DELETE POST =================

app.get("/delete/:id", isLoggedIn, async (req, res) => {

    await postModel.findByIdAndDelete(req.params.id);

    await userModel.findOneAndUpdate(
        {
            post: req.params.id
        },
        {
            $pull: { post: req.params.id }
        }
    );

    res.redirect("/profile");
});



// ================= AUTH MIDDLEWARE =================

function isLoggedIn(req, res, next) {

    if (!req.cookies.token) {
        return res.redirect("/login");
    }

    let data = jwt.verify(req.cookies.token, "hemant");

    req.user = data;

    next();
}



// ================= SERVER =================

app.listen(3000, () => {
    console.log("Server Started");
});