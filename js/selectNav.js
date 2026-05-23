
var class_list = [
  ['class1', 'navClass1', 'navClass1_button'],
  ['class2', 'navClass2', 'navClass2_button'],
  ['class3', 'navClass3', 'navClass3_button'],
  ['class4', 'navClass4', 'navClass4_button'],
  ['class5', 'navClass5', 'navClass5_button'],
  ['class6', 'navClass6', 'navClass6_button'],
  ['class7', 'navClass7', 'navClass7_button'],
  ['class8', 'navClass8', 'navClass8_button'],
  ['class9', 'navClass9', 'navClass9_button'],
  ['class10', 'navClass10', 'navClass10_button'],
  ['class11', 'navClass11', 'navClass11_button'],
  ['class12', 'navClass12', 'navClass12_button']
]

var navClassTags = {}

var navClass_buttonTags = {}

//将磁贴元素存入变量
function initialize_navClassTags(class_list){
  let navClassTags = {}
  for(let i=0; i<class_list.length; i++){
    navClassTags[class_list[i][0]] = document.getElementById(class_list[i][1])
  }
  return navClassTags
}

//将筛选按钮元素存入变量
function initialize_navClass_buttonTags(class_list){
  let navClass_buttonTags = {}
  for(let i=0; i<class_list.length; i++){
    navClass_buttonTags[class_list[i][0]] = document.getElementById(class_list[i][2])
  }
  return navClass_buttonTags
}

navClassTags = initialize_navClassTags(class_list)

navClass_buttonTags = initialize_navClass_buttonTags(class_list)

//与导航分类按钮绑定的函数
function change_navClass1() {
  navChoice = 'class1';
}
function change_navClass2() {
  navChoice = 'class2';
}
function change_navClass3() {
  navChoice = 'class3';
}
function change_navClass4() {
  navChoice = 'class4';
}
function change_navClass5() {
  navChoice = 'class5';
}
function change_navClass6() {
  navChoice = 'class6';
}
function change_navClass7() {
  navChoice = 'class7';
}
function change_navClass8() {
  navChoice = 'class8';
}
function change_navClass9() {
  navChoice = 'class9';
}
function change_navClass10() {
  navChoice = 'class10';
}
function change_navClass11() {
  navChoice = 'class11';
}
function change_navClass12() {
  navChoice = 'class12';
}

function reset_style(){
  for(let key in navClassTags){
    navClassTags[key].style.display = 'none';
  }
  for(let key in navClass_buttonTags){
    navClass_buttonTags[key].style.borderBottom = '3px solid #ffffff00';
    navClass_buttonTags[key].style.color = 'white';
  }
}

function set_style(choice){
  navClass_buttonTags[choice].style.borderBottom = '3px solid #a3def8'
  navClass_buttonTags[choice].style.color = '#a3def8';
  navClassTags[choice].style.display = 'flex';
}

//检查函数
function checkNavChoice() {

  //先每次重置样式
  reset_style()

  //再根据navChoice变量应用对应的样式
  set_style(navChoice)

}

//进入页面自动显示第一类
navChoice = 'class1';
checkNavChoice()