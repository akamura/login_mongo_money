"use strict";
//renderで動作するために追加
const BASE_URL = location.hostname === "localhost"
    ? "http://localhost:8001"
    : "https://mongo-money-api.onrender.com"

// フロントエンドのコード

// let loginKey = 0;

// if (!loginKey) {
//     window.location.replace("../login/login.html"); // ページ2に飛ばす（履歴に残らない）
// }

// const { Server } = require("http");

//円グラフのモジュールの読み込み
const canvas = document.getElementById("pieChart");
const ctx = canvas.getContext("2d");

function pie (dataArray) {//円グラフの内部数値の設定

    //円グラフの描画
    
    // const dataArray = [30,70,45,55];
    const colors = ["red", "blue", "green", "orange","yellow","gray","brown","purple","indigo","khaki"];
    const total = dataArray.reduce((a,b) => a + b);
    console.log(total);
    let starAngle = 0;
    
    dataArray.forEach((value,index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;//要素ごとの円周の長さの計算

        ctx.beginPath();
        ctx.moveTo(150,150);
        ctx.arc(150, 150, 100, starAngle, starAngle + sliceAngle);
        ctx.closePath();
    
        ctx.fillStyle = colors[index];
        ctx.fill();
    
        starAngle += sliceAngle;
    });
}

//日付のデータの取得
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth()+1;
const weeks = now.getDay();
const week = ["日","月","火","水","木","金","土"][weeks];
const day = now.getDate();
const justNow = new Date(now.getTime());

document.getElementById("nowMonth").textContent = month;
document.getElementById("nowDate").textContent = day;
document.getElementById("nowWeek").textContent = week;
document.getElementById("table_month_span").textContent = month;

console.log(weeks);
console.log(week);
console.log(day);
console.log(justNow);
console.log(justNow.getMonth());

//ユーザーの設定
let currentUser = "user_1"; //デフォルトユーザー

document.getElementById("user_select").addEventListener("change", (e) => {
    currentUser = e.target.value;
    receive();
});

//送信ボタンを押すと直近の買い物の金額を取得
const send_expend = document.getElementById("send_expenditure");

let expendData = null;
let incomeData = null;

send_expend.addEventListener("click",(e)=>{
    //押すたびに値を変えるのならイベント内で定義すること
    const now_expend = document.getElementById("now_expenditure").value;//出費額
    const typeOfExpenditure = document.getElementById("type_of_expenditure").value;//出費のタイプ
    const remark = document.getElementById("remark").value;//備考欄の取得
    console.log(now_expend);
    console.log(typeOfExpenditure);

    expendData = {
        timeStamp : justNow,
        user : currentUser,
        mode : "expend",
        expend : now_expend,
        type : typeOfExpenditure,
        remark : remark
    }

    console.log(expendData);
    send(expendData).then(()=>{
        receive();
    });
});

//直近の収入をsendボタンを押したら取得する

// document.getElementById("send_income").addEventListener("click" ,(e) => {
//     const nowIncome = document.getElementById("now_income").value;
//     console.log(nowIncome);
//     incomeData = {
//         mode : "income",
//         income : nowIncome
//     }
//     console.log(incomeData);
//     send(incomeData).then(()=> {
//         receive();
//     });
// });

function send (data) {  //ポート8001にデータを送信する
    console.log(`関数send内のdata:${data}`)
    return fetch(`${BASE_URL}/`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json"
        }
    })
    .then(res => res.text())
    .then(res => console.log("送信結果：",res))
    .catch(err => console.log("送信エラー：",err));

}
//タイプごとの総額（今月）のためのオブジェクト　要らないかも？
const monthTypeObjectExpend = {
    "investment" : 0,
    "waste" : 0,
    "necessities" : 0,
    "eating_out" : 0,
    "delivery" : 0,
    "book" : 0,
    "teaching_material" : 0,
    "convenience" : 0,
    "food" : 0,
    "other" : 0,
};

let typeArray = ["investment","waste","necessities","eating_out","delivery","book","teaching_material","food","other"];


function receive () {//情報の受け取りと値の成型と貼り付け GAS側でやっていたデータの集計などをフロントでする

    //表やグラフの値をリセットする
    //月ごとのタイプ別支出をリセット
    for (let key in monthTypeObjectExpend) {
        monthTypeObjectExpend[key] = 0;
    }

    //表示をリセット
    for (let typeName in monthTypeObjectExpend) {
        const cell = document.getElementById(`${typeName}`)
        if (cell) cell.textContent = "0";
    }
    
    //canvasのグラフをクリア
    ctx.clearRect(0,0, canvas.width, canvas.height);


    fetch(`${BASE_URL}/relay?user=${currentUser}`)//開けたポートのurlを代入する
    .then(res => res.json())
    .then(data => {
        console.log("受け取りデータ：", data);
        console.log("受け取りデータ：", data.expendDataObjectArray);
        // console.log("受け取りデータ：", data.expendType);
        // console.log("受け取りデータ：", data.expendDataObjArray);

        const now = new Date();
        const sunday = new Date(now);
        sunday.setDate(now.getDate() - now.getDay());//日曜日の日にちを計算
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + (6-now.getDay()));//土曜日の日にちを計算

        let totalToday = 0, totalWeek = 0, totalMonth = 0;
        let hourlyExpend = 0, hourlyExpendMonty = 0;
        const typeMap = {};//タイプごとの総額を入れるオブジェクト
        const objArray = [];

        const dataObjArray = data.expendDataObjectArray;

        dataObjArray.forEach(entry => {//dataの型{expendDataObjectArray:[a,b,c...]}
            console.log(entry);
            const date = new Date(entry.timeStamp);
            const amount = Number(entry.expend || 0);
            const type = entry.type;
            
            // タイプごとの金額を入れるオブジェクトを自動で作っているとGPT入っているが、うまく機能していないプロンプト
            if(!typeMap[type]) typeMap[type] = 0;
            typeMap[type] += amount;


            if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
                totalMonth += amount; //今月の集計

                for(let typeObj in monthTypeObjectExpend) {//種別ごとの今月の合計
                    if(type === typeObj) {
                        monthTypeObjectExpend[typeObj] += amount;
                    }
                }

                if(date.toDateString() === now.toDateString()) {
                    totalToday += amount; //今日の集計
                }

                //今週の集計
                // if (sunday.getDate() < date.getDate() && date.getDate() <= saturday.getDate()) {
                //     totalWeek += amount;
                // }
                const inThisWeek = (date >= sunday) && (date <= saturday);
                if (inThisWeek) {
                    totalWeek += amount;
                }
            }

        });


        console.log("obfArray : ", objArray);
        console.log("monthTypeObjectExpend : ",monthTypeObjectExpend);

        //時給換算の計算

        hourlyExpend = Math.floor((totalToday / 24) * 100) / 100;
        hourlyExpendMonty = Math.floor((totalMonth / now.getDay() / 24) * 100) / 100;

        document.getElementById("hourly_wage").textContent = hourlyExpend;
        document.getElementById("hourly_wage_month").textContent = hourlyExpendMonty;
        document.getElementById("today_expense").textContent = totalToday;
        document.getElementById("week_expense").textContent = totalWeek;
        document.getElementById("month_expense").textContent = totalMonth;
        
        //テーブルに支出の値を記入する
        let i = 0;
        for(let typeName in monthTypeObjectExpend) {
            
            console.log(typeName);
            console.log(monthTypeObjectExpend[typeName]);
            document.getElementById(`${typeName}`).textContent = monthTypeObjectExpend[typeName];
            i++;
            
        };

        //グラフ用に色をそろえるなど、データを成型する

        for(let typeName in monthTypeObjectExpend) {
            objArray.push({
                "type" : typeName,
                "price" : monthTypeObjectExpend[typeName],
                "color" : randomColorFor(typeName)
            });
        }

        console.log("objArray : ", objArray);
        
        let expendArray = [];
        let count = 0;
        for(let expend of data.expendDataObjectArray){
            // console.log(data.expendType[expend]);
            expendArray.push(data.expendDataObjectArray[expend]);
            count++
        };

        let newArray = [];
        let colorArray = [];
        for(let obj of data.expendDataObjectArray) {//色とタイプが固定するように配列を作る
            // console.log(obj);
            colorArray.push(obj.color);
            newArray.push([obj.type,obj.price,obj.color]);
        }
        // console.log(colorArray);
        // console.log(newArray);
        // pie(expendArray);
        pieObjArray(objArray);

    })
    .catch(err => console.error("取得失敗：",err));
}

function pieObjArray (objArray) {
    console.log("test")
    console.log(objArray)
    const filteredData = objArray.filter(obj => {
        console.log(obj.price)
        return obj.price > 0 ;//priceがゼロのカテゴリーを排除
    });
    console.log(filteredData);

    const sortedData = filteredData.sort((a,b) => b.price - a.price);//データを値段の降順で並べ替える
    console.log(sortedData);

    const total = sortedData.reduce((sum, obj) => sum + obj.price, 0);//reduce((累積地,要素) => 処理,初期値)　これで全体の合計値を算出する。

    let starAngle = -0.5 * Math.PI;//12時方向を描画のスタート地点にする
    ctx.clearRect( 0, 0, canvas.width, canvas.height);//前のグラフをクリアする。

    sortedData.forEach(obj => {
        const sliceAngle = (obj.price / total) * 2 * Math.PI;

        ctx.beginPath();
        ctx.moveTo(150,150);//円の中心へ移動
        ctx.arc(
            150,        //中心X
            150,        //中心Y
            100,        //半径
            starAngle,  //描画の開始角度
            starAngle + sliceAngle//描画の終了角度
        );
        ctx.closePath();

        ctx.fillStyle = obj.color;//カテゴリの色の取得
        ctx.fill();//塗りつぶしコマンド

        starAngle += sliceAngle;
    });

    //凡例の描画
    let legendX = 300;
    let legendY = 50;
    const legendBoxSize = 20;

    ctx.font = "14px sans-serif";
    filteredData.forEach(obj => {
        
        console.log("test")
        ctx.fillStyle = obj.color;
        ctx.fillRect(legendX,legendY,legendBoxSize,legendBoxSize);

        ctx.fillStyle = "black";
        ctx.fillText(`${obj.type}(${obj.price}円)`, legendX + legendBoxSize + 5, legendY + 15);
        
        legendY += 30;
    
    });

}

function randomColorFor(type) {
    const colorMap = {
        "investment": "#3366CC",
        "waste": "#DC3912",
        "necessities": "#FF9900",
        "eating_out": "#109618",
        "delivery": "#990099",
        "book": "#0099C6",
        "teaching_material": "#DD4477",
        "convenience": "#66AA00",
        "food": "#B82E2E",
        "other": "#316395"
    };

    return colorMap[type];
}

function convertIdToType(id) {
    const map = {
        investment: "投資",
        waste_expense: "浪費",
        necessities: "日用品",
        eating_out: "外食",
        delivery: "出前",
        book: "本",
        teaching_material: "教材",
        convenience: "コンビニ",
        food: "食品",
        other: "その他",
    };

    return map[id];
}

receive();