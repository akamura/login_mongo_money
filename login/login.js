"use strict";

const form  = document.getElementById("login-form");

form.addEventListener("submit" , async (e) => {
    e.preventDefault();
    const id = document.getElementById("login-id").value.trim();
    const pass = document.getElementById("login-pass").value;
    if (!id || !pass) {
        alert("IDとパスワードの入力");
        return;
    }

    try {
        const res = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ id, pass})
        });
        const data = await res.json();
        if(data.success) location.href = "/";
        else alert(data.message || "ログイン失敗");
    } catch (err) {
        console.error(err);
        alert("通信エラー");
    }
});