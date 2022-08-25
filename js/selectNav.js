//将磁贴元素存入变量
let navClass1Tag = document.getElementById('navClass1');
let navClass2Tag = document.getElementById('navClass2');
let navClass3Tag = document.getElementById('navClass3');
let navClass4Tag = document.getElementById('navClass4');
let navClass5Tag = document.getElementById('navClass5');
let navClass6Tag = document.getElementById('navClass6');
let navClass7Tag = document.getElementById('navClass7');
let navClass8Tag = document.getElementById('navClass8');
let navClass9Tag = document.getElementById('navClass9');
let navClass10Tag = document.getElementById('navClass10');
let navClass11Tag = document.getElementById('navClass11');
let navClass12Tag = document.getElementById('navClass12');

//将筛选按钮元素存入变量
let navClass1_buttonTag = document.getElementById('navClass1_button');
let navClass2_buttonTag = document.getElementById('navClass2_button');
let navClass3_buttonTag = document.getElementById('navClass3_button');
let navClass4_buttonTag = document.getElementById('navClass4_button');
let navClass5_buttonTag = document.getElementById('navClass5_button');
let navClass6_buttonTag = document.getElementById('navClass6_button');
let navClass7_buttonTag = document.getElementById('navClass7_button');
let navClass8_buttonTag = document.getElementById('navClass8_button');
let navClass9_buttonTag = document.getElementById('navClass9_button');
let navClass10_buttonTag = document.getElementById('navClass10_button');
let navClass11_buttonTag = document.getElementById('navClass11_button');
let navClass12_buttonTag = document.getElementById('navClass12_button');

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

//检查函数
function checkNavChoice() {

  //先每次重置样式
  navClass1Tag.style.display = 'none';
  navClass1_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass1_buttonTag.style.color = 'white';
  navClass2Tag.style.display = 'none';
  navClass2_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass2_buttonTag.style.color = 'white';
  navClass3Tag.style.display = 'none';
  navClass3_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass3_buttonTag.style.color = 'white';
  navClass4Tag.style.display = 'none';
  navClass4_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass4_buttonTag.style.color = 'white';
  navClass5Tag.style.display = 'none';
  navClass5_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass5_buttonTag.style.color = 'white';
  navClass6Tag.style.display = 'none';
  navClass6_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass6_buttonTag.style.color = 'white';
  navClass7Tag.style.display = 'none';
  navClass7_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass7_buttonTag.style.color = 'white';
  navClass8Tag.style.display = 'none';
  navClass8_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass8_buttonTag.style.color = 'white';
  navClass9Tag.style.display = 'none';
  navClass9_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass9_buttonTag.style.color = 'white';
  navClass10Tag.style.display = 'none';
  navClass10_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass10_buttonTag.style.color = 'white';
  navClass11Tag.style.display = 'none';
  navClass11_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass11_buttonTag.style.color = 'white';
  navClass12Tag.style.display = 'none';
  navClass12_buttonTag.style.borderBottom = '3px solid #ffffff00'
  navClass12_buttonTag.style.color = 'white';

  //再根据navChoice变量应用对应的样式
  if (navChoice === 'class1') {
    navClass1_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass1_buttonTag.style.color = '#a3def8';
    navClass1Tag.style.display = 'flex';
  } else if (navChoice === 'class2') {
    navClass2_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass2_buttonTag.style.color = '#a3def8';
    navClass2Tag.style.display = 'flex';
  } else if (navChoice === 'class3') {
    navClass3_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass3_buttonTag.style.color = '#a3def8';
    navClass3Tag.style.display = 'flex';
  } else if (navChoice === 'class4') {
    navClass4_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass4_buttonTag.style.color = '#a3def8';
    navClass4Tag.style.display = 'flex';
  } else if (navChoice === 'class5') {
    navClass5_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass5_buttonTag.style.color = '#a3def8';
    navClass5Tag.style.display = 'flex';
  } else if (navChoice === 'class6') {
    navClass6_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass6_buttonTag.style.color = '#a3def8';
    navClass6Tag.style.display = 'flex';
  } else if (navChoice === 'class7') {
    navClass7_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass7_buttonTag.style.color = '#a3def8';
    navClass7Tag.style.display = 'flex';
  } else if (navChoice === 'class8') {
    navClass8_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass8_buttonTag.style.color = '#a3def8';
    navClass8Tag.style.display = 'flex';
  } else if (navChoice === 'class9') {
    navClass9_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass9_buttonTag.style.color = '#a3def8';
    navClass9Tag.style.display = 'flex';
  } else if (navChoice === 'class10') {
    navClass10_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass10_buttonTag.style.color = '#a3def8';
    navClass10Tag.style.display = 'flex';
  } else if (navChoice === 'class11') {
    navClass11_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass11_buttonTag.style.color = '#a3def8';
    navClass11Tag.style.display = 'flex';
  } else if (navChoice === 'class12') {
    navClass12_buttonTag.style.borderBottom = '3px solid #a3def8'
    navClass12_buttonTag.style.color = '#a3def8';
    navClass12Tag.style.display = 'flex';
  }

}

//进入页面自动显示第一类
navChoice = 'class1';
checkNavChoice()