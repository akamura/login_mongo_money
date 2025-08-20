"use strict";

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const { runInNewContext } = require("vm");
require("dotenv").config();

const app = express();

//セッションと中間処理

app.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 }
}));
app.use(cors());
app.use(bodyParser.json());

//ログインページの静的配信（認証不要）
app.use("/login", express.static(path.join(__dirname,"login")));

//認可ミドルウェア
const openPath = new Set([
    "/login",
    "/login/",
    "/login/login.html",
    "/login/login.js",
    "/favicon.ico"
]);
app.use((req,res,next) => {
    if(openPath.has(req.path) || req.path.startsWith("/login/")) return next();
    if(req.session.user) return next();
    return res.redirect("/login/login.html"); 
});

//認証後の静的配信
app.use(express.static(path.join(__dirname, "public")));

//mongoDB
const mongoURL = process.env.MONGO_URI;
mongoose.connect(mongoURL)
    .then(()=> console.log("MongoDB接続成功"))
    .catch(err => console.log("MongoDB接続失敗",err));

//スキーマ
const expenseSchema = new mongoose.Schema({
    user: String,
    mode: String,
    expend: Number,
    type: String,
    remark: String,
    timeStamp: Date
});

const Expense = mongoose.model("Expense", expenseSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    passwordHash: String
});
const User = mongoose.model("User", userSchema);

//認証
app.post("/login",async (req, res) => {
    try {
        const { id, pass } = req.body;
        const user = await User.findOne({ username: id});
        
        if (!user) return res.json({ success: false, message: "ログイン失敗"});
        const ok = await bcrypt.compare(pass, user.passwordHash);

        if (!ok) return res.json({ success: false, message: "ログイン失敗"});
        req.session.user = { username: user.username };
        return res.json({ success: true, message:"ログイン成功"});
    } catch (err) {
        console.log("ログインエラー：", err);
        return res.status(500).json({ success:false, message: "サーバーエラー"});
    }
});

app.post("/logout",(req,res) => {
    req.session.destroy(() => res.json({ ok: true}));
});

//データ保存
app.post("/", async (req, res) => {
    try {
        const { user, timeStamp, mode, expend, type, remark} = req.body;
        if (!user || !timeStamp || !mode || !expend || !type || !remark) {
            return res.status(400).send("不正なデータ");
        }
        const newExpense = new Expense ({
            user,
            mode,
            timeStamp: new Date(timeStamp),
            expend: Number(expend) || 0,
            type,
            remark: remark ?? ""
        });
        await newExpense.save();
        res.send("保存成功");
    } catch (err) {
        console.error("保存エラー：", err, req.body);
        res.status(500).send("保存失敗");
    }
});

//データ取得
app.get("/relay", async (req, res) => {
    try {
        const { user } = req.query;
        const filter = user ? { user } : {};
        const expenses = await Expense.find(filter).sort({ timeStamp: -1}).limit(100);
        res.json({ expendDataObjectArray: expenses});
    } catch (err) {
        console.error("取得エラー：", err);
        res.status(500).send("取得失敗");
    }
});

//初期ユーザー
async function seedUser() {
    const { DEFAULT_USER, DEFAULT_PASS, MODE_ENV} = process.env;
    if (!DEFAULT_USER || !DEFAULT_PASS ) return;
    const exists = await User.findOne({ username: DEFAULT_USER});
    if (exists) return;
    const hash = await bcrypt.hash(DEFAULT_PASS, 10);
    await User.create({ username: DEFAULT_USER,passwordHash: hash});
    if (MODE_ENV !== "production") {
        console.log(`初期ユーザー設定：${DEFAULT_USER}（パスワードは非表示）`)
    }
}
seedUser().catch(console.error);

//起動
const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
    console.log("MongoDB対応サーバ稼働中：ポート8001");
});