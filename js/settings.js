//将元素存入变量
let settingsTag = document.getElementById('settings'); //设置菜单
let bodyTag = document.getElementById("body"); //身体
let mainTag = document.getElementById("main"); //页面主体

let searchEngineFormTag = document.getElementById("searchEngineForm"); //搜索框-form标签
let searchEngineIconTag = document.getElementById("searchEngineIcon"); //搜索框-搜索引擎图标
let searchEngineInputTag = document.getElementById("searchEngineInput"); //搜索框-搜索引擎输入框

let navTag = document.getElementById("nav"); //导航区
let navSelectTag = document.getElementById("navSelect"); //导航选择区

let settingsButtonTag = document.getElementById("settingsButton"); //设置菜单按钮
let searchEngineSelectTag = document.getElementById("searchEngineSelect"); //搜索设置-搜索引擎下拉框
let darkModeTag = document.getElementById("darkMode"); //外观设置-深色模式勾选框
let meiRiYiTuTag = document.getElementById("meiRiYiTu"); //背景设置-每日一图单选框
let ziDingYiTag = document.getElementById("ziDingYi"); //背景设置-自定义单选框
let ziDingYiInputDivTag = document.getElementById("ziDingYiInputDiv"); //背景设置-自定义输入部分
let ziDingYiInputBoxTag = document.getElementById("ziDingYiInputBox"); //背景设置-自定义背景图片链接输入框
let xianShiDaoHangTag = document.getElementById("xianShiDaoHang"); //页面布局设置-显示导航勾选框

//设置菜单显示隐藏
let displaySettings = true; //css中本来就隐藏了，而且点了按钮才会触发检测函数，所以这里为true
function changeSettings() {
  if (displaySettings) {
    settingsTag.style.transform = 'scale(1, 1)';
    settingsButtonTag.innerText = "×";
  } else {
    settingsTag.style.transform = 'scale(0, 0)';
    settingsButtonTag.innerText = "⚙";
  }
  displaySettings = !displaySettings;
}


//搜索设置

function setSearchEngine(choice) {
  if (choice === "百度") {
    searchEngineFormTag.action = "https://www.baidu.com/s";
    searchEngineInputTag.name = "wd";
    searchEngineIconTag.src = "./assets/engineBaidu.svg";
    window.localStorage.setItem("searchEngine", "百度");
  } else if (choice === "必应") {
    searchEngineFormTag.action = "https://cn.bing.com/search";
    searchEngineInputTag.name = "q";
    searchEngineIconTag.src = "./assets/engineBing.svg";
    window.localStorage.setItem("searchEngine", "必应");
  } else if (choice === "Derpibooru图片") {
    searchEngineFormTag.action = "https://trixiebooru.org/search";
    searchEngineInputTag.name = "q";
    searchEngineIconTag.src = "./assets/engineDerpibooru.svg";
    window.localStorage.setItem("searchEngine", "Derpibooru图片");
  } else if (choice === "FimTale小说") {
    searchEngineFormTag.action = "https://fimtale.com/topics";
    searchEngineInputTag.name = "q";
    searchEngineIconTag.src = "./assets/engineFimtale.ico";
    window.localStorage.setItem("searchEngine", "FimTale小说");
  } else if (choice === "EqCN资讯") {
    searchEngineFormTag.action = "https://www.equestriacn.com/";
    searchEngineInputTag.name = "s";
    searchEngineIconTag.src = "./assets/equestriacn.ico";
    window.localStorage.setItem("searchEngine", "EqCN资讯");
  }

}

//外观设置

document.querySelector('link[href="./css/canterlot-site-dark.css"]').disabled = true; //找到深色模式css并默认不启用
let disableDarkMode = false; //取消忽略深色模式css，但仅仅设置了变量，还要执行函数才能有效果

function change_darkMode() {
  document.querySelector('link[href="./css/canterlot-site-dark.css"]').disabled = disableDarkMode;
  disableDarkMode = !disableDarkMode;
  if (darkMode.checked) {
    window.localStorage.setItem("darkMode", "是");
  } else {
    window.localStorage.setItem("darkMode", "否");
  }
}

//背景设置

//每日一图
meiRiYiTuTag.addEventListener("change", setMeiRiYiTu);
function setMeiRiYiTu() {
  ziDingYiInputDivTag.style.display = "none";
  bodyTag.style.backgroundImage = "url(https://api.kdcc.cn/img/jump.php)";
  window.localStorage.setItem("backgroundImage", "每日一图");
}

//自定义
ziDingYiTag.addEventListener("change", setziDingYi);
function setziDingYi() {
  ziDingYiTag.checked = true; //勾选“自定义”，此时“每日一图”会自动取消勾选
  ziDingYiInputDivTag.style.display = "flex";
}

function applyBackgroundImage() {
  window.localStorage.setItem("backgroundImage", "自定义");
  let ziDingYiInputBoxValue = document.getElementById("ziDingYiInputBox").value; //将自定义背景图片链接输入框的值存入变量
  bodyTag.style.backgroundImage = "url(" + ziDingYiInputBoxValue + ")";
  window.localStorage.setItem("backgroundImageURL", ziDingYiInputBoxValue);
}

//页面布局设置

let xianShiDaoHang = false;

//显示导航
function change_xianShiDaoHang() {
  if (xianShiDaoHang) {
    xianShiDaoHangTag.checked = true; //勾选“显示导航”
    navTag.style.display = "flex";
    navSelectTag.style.display = "flex";
    bodyTag.style.height = "auto";
    mainTag.style.height = "auto";
    window.localStorage.setItem("xianShiDaoHang", "是");
  } else {
    xianShiDaoHangTag.checked = false; //取消勾选“显示导航”
    navTag.style.display = "none";
    navSelectTag.style.display = "none";
    bodyTag.style.height = "100vh";
    mainTag.style.height = "100%";
    window.localStorage.setItem("xianShiDaoHang", "否");
  }
  xianShiDaoHang = !xianShiDaoHang;
}

let ElementData = {}

let beControlledElementIds = ["xianShiFangWenLiang"];//对不同的元素分别创建对象
for (i = 0; i < beControlledElementIds.length; i++) {
  ElementData[beControlledElementIds[i]] = {};
  ElementData[beControlledElementIds[i]]["show"] = false;
}

//控制元素显示或隐藏
function changeElementHideOrShow(ElementId) {
  ElementData[ElementId]["ControlCheckBoxTag"] = document.getElementById(ElementId);
  ElementData[ElementId]["TargetTag"] = document.getElementById(ElementId + "_Target");
  if (ElementData[ElementId]["show"]) {
    ElementData[ElementId]["ControlCheckBoxTag"].checked = true; //勾选设置菜单中的勾选框
    ElementData[ElementId]["TargetTag"].style.display = "flex"; //显示目标元素
    window.localStorage.setItem(ElementId, "是");
  } else {
    ElementData[ElementId]["ControlCheckBoxTag"].checked = false; //取消勾选设置菜单中的勾选框
    ElementData[ElementId]["TargetTag"].style.display = "none"; //隐藏目标元素
    window.localStorage.setItem(ElementId, "否");
  }
  ElementData[ElementId]["show"] = !ElementData[ElementId]["show"];
}

//恢复默认设置
function setDefultSettings() {
  if (confirm("确定恢复默认？")) {
    window.localStorage.clear();
    window.location.reload(); //刷新页面
  }
}

//数据库

//搜索设置数据库
let searchEngineData = window.localStorage.getItem("searchEngine");
if (searchEngineData) {
  setSearchEngine(searchEngineData);
}

//外观设置数据库
let darkModeData = window.localStorage.getItem("darkMode");
if (darkModeData) {
  if (darkModeData === "是") {
    darkMode.checked = true;
    disableDarkMode = false;
    change_darkMode();
  } else {
    darkMode.checked = false;
    disableDarkMode = true;
    change_darkMode();
  }
}

//背景设置数据库
let backgroundImageData = window.localStorage.getItem("backgroundImage");
let backgroundImageURLData = window.localStorage.getItem("backgroundImageURL");
if (backgroundImageData) {
  if (backgroundImageData === "每日一图") {
    setMeiRiYiTu();
  } else if (backgroundImageData === "自定义") {
    ziDingYiInputBoxTag.value = backgroundImageURLData; //将自定义背景图片链接输入框内的内容变为数据库中的内容
    setziDingYi();
    applyBackgroundImage();
  }
  /*
  以下这种代码作用是：当数据库中没有数据时，把css中留空的东西用js设置
  （但由于调用了上面的函数会写入localStorage，不用管，没有影响）
  */
} else {
  setMeiRiYiTu();
}

//页面布局设置数据库
let xianShiDaoHangData = window.localStorage.getItem("xianShiDaoHang");
if (xianShiDaoHangData) {
  if (xianShiDaoHangData === "是") {
    xianShiDaoHang = true;
    change_xianShiDaoHang();
  } else {
    xianShiDaoHang = false;
    change_xianShiDaoHang();
  }
} else {
  xianShiDaoHang = true;
  change_xianShiDaoHang();
}

for (i = 0; i < beControlledElementIds.length; i++) {
  let data = window.localStorage.getItem(beControlledElementIds[i]);
  if (data) {
    if (data === "是") {
      ElementData[beControlledElementIds[i]]["show"] = true;
      changeElementHideOrShow(beControlledElementIds[i]);
    } else {
      ElementData[beControlledElementIds[i]]["show"] = false;
      changeElementHideOrShow(beControlledElementIds[i]);
    }
  } else {
    ElementData[beControlledElementIds[i]]["show"] = true;
    changeElementHideOrShow(beControlledElementIds[i]);
  }
}