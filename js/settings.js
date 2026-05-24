(function() {
  'use strict';

  // 元素引用
  const settingsTag = document.getElementById('settings');
  const bodyTag = document.getElementById('body');
  const searchEngineFormTag = document.getElementById('searchEngineForm');
  const searchEngineIconTag = document.getElementById('searchEngineIcon');
  const searchEngineInputTag = document.getElementById('searchEngineInput');
  const navTag = document.getElementById('nav');
  const settingsButtonTag = document.getElementById('settingsButton');
  const darkModeTag = document.getElementById('darkMode');
  const meiRiYiTuTag = document.getElementById('meiRiYiTu');
  const ziDingYiTag = document.getElementById('ziDingYi');
  const ziDingYiInputDivTag = document.getElementById('ziDingYiInputDiv');
  const ziDingYiInputBoxTag = document.getElementById('ziDingYiInputBox');
  const chunSeBeiJingTag = document.getElementById('chunSeBeiJing');
  const xianShiDaoHangTag = document.getElementById('xianShiDaoHang');

  // 设置菜单开关
  let displaySettings = true;

  window.changeSettings = function() {
    if (displaySettings) {
      settingsTag.style.transform = 'scale(1, 1)';
      settingsButtonTag.innerText = '×';
    } else {
      settingsTag.style.transform = 'scale(0, 0)';
      settingsButtonTag.innerText = '⚙';
    }
    displaySettings = !displaySettings;
  };

  // 搜索引擎选择
  window.setSearchEngine = function(choice) {
    if (choice === '百度') {
      searchEngineFormTag.action = 'https://www.baidu.com/s';
      searchEngineInputTag.name = 'wd';
      searchEngineIconTag.src = './assets/engineBaidu.svg';
      window.localStorage.setItem('searchEngine', '百度');
    } else if (choice === '必应') {
      searchEngineFormTag.action = 'https://cn.bing.com/search';
      searchEngineInputTag.name = 'q';
      searchEngineIconTag.src = './assets/engineBing.svg';
      window.localStorage.setItem('searchEngine', '必应');
    } else if (choice === 'Derpibooru图片') {
      searchEngineFormTag.action = 'https://trixiebooru.org/search';
      searchEngineInputTag.name = 'q';
      searchEngineIconTag.src = './assets/engineDerpibooru.svg';
      window.localStorage.setItem('searchEngine', 'Derpibooru图片');
    } else if (choice === 'FimTale小说') {
      searchEngineFormTag.action = 'https://fimtale.com/topics';
      searchEngineInputTag.name = 'q';
      searchEngineIconTag.src = './assets/engineFimtale.ico';
      window.localStorage.setItem('searchEngine', 'FimTale小说');
    } else if (choice === 'EqCN资讯') {
      searchEngineFormTag.action = 'https://www.equestriacn.com/';
      searchEngineInputTag.name = 's';
      searchEngineIconTag.src = './assets/equestriacn.ico';
      window.localStorage.setItem('searchEngine', 'EqCN资讯');
    }
  };

  // 深色模式
  const darkModeLink = document.querySelector('link[href="./css/canterlot-site-dark.css"]');
  darkModeLink.disabled = true;
  let disableDarkMode = false;

  window.change_darkMode = function() {
    darkModeLink.disabled = disableDarkMode;
    disableDarkMode = !disableDarkMode;
    window.localStorage.setItem('darkMode', darkModeTag.checked ? '是' : '否');
  };

  // 背景：每日一图
  meiRiYiTuTag.addEventListener('change', function() {
    bodyTag.classList.remove('solid-background');
    ziDingYiInputDivTag.style.display = 'none';
    bodyTag.style.backgroundImage = 'url(https://api.kdcc.cn/img/jump.php)';
    window.localStorage.setItem('backgroundImage', '每日一图');
  });

  // 背景：自定义
  ziDingYiTag.addEventListener('change', function() {
    bodyTag.classList.remove('solid-background');
    ziDingYiInputDivTag.style.display = 'flex';
  });

  window.applyBackgroundImage = function() {
    const value = ziDingYiInputBoxTag.value.trim();
    if (!value) {
      alert('请输入图片链接');
      return;
    }
    if (!(value.startsWith('https://') || value.startsWith('http://') || value.startsWith('./') || value.startsWith('../') || value.startsWith('/'))) {
      alert('请输入有效的图片链接（以 http://、https://、./、../ 或 / 开头）');
      return;
    }
    // 仅允许安全字符，防止 CSS 注入
    if (/[()'"]/.test(value)) {
      alert('图片链接包含不支持的字符');
      return;
    }
    bodyTag.classList.remove('solid-background');
    window.localStorage.setItem('backgroundImage', '自定义');
    bodyTag.style.backgroundImage = 'url("' + value.replace(/"/g, '\\"') + '")';
    window.localStorage.setItem('backgroundImageURL', value);
  };

  // 背景：纯色
  chunSeBeiJingTag.addEventListener('change', function() {
    bodyTag.classList.add('solid-background');
    bodyTag.style.backgroundImage = '';
    ziDingYiInputDivTag.style.display = 'none';
    window.localStorage.setItem('backgroundImage', '纯色背景');
  });

  // 导航可见性
  let xianShiDaoHang = false;

  window.change_xianShiDaoHang = function() {
    if (xianShiDaoHang) {
      xianShiDaoHangTag.checked = true;
      navTag.style.display = 'flex';
      bodyTag.style.height = 'auto';
      window.localStorage.setItem('xianShiDaoHang', '是');
    } else {
      xianShiDaoHangTag.checked = false;
      navTag.style.display = 'none';
      bodyTag.style.height = '100vh';
      window.localStorage.setItem('xianShiDaoHang', '否');
    }
    xianShiDaoHang = !xianShiDaoHang;
  };

  // 通过复选框控制元素显示/隐藏
  const elementData = {};
  const beControlledElementIds = ['xianShiFangWenLiang'];

  for (let i = 0; i < beControlledElementIds.length; i++) {
    const id = beControlledElementIds[i];
    elementData[id] = {
      show: false,
      controlCheckBoxTag: document.getElementById(id),
      targetTag: document.getElementById(id + '_Target'),
    };
  }

  window.changeElementHideOrShow = function(elementId) {
    const data = elementData[elementId];
    if (data.show) {
      data.controlCheckBoxTag.checked = true;
      data.targetTag.style.display = 'flex';
      window.localStorage.setItem(elementId, '是');
    } else {
      data.controlCheckBoxTag.checked = false;
      data.targetTag.style.display = 'none';
      window.localStorage.setItem(elementId, '否');
    }
    data.show = !data.show;
  };

  // 恢复默认设置
  window.setDefaultSettings = function() {
    if (confirm('确定恢复默认？')) {
      window.localStorage.clear();
      window.location.reload();
    }
  };

  // --- 恢复已保存的设置 ---

  const searchEngineData = window.localStorage.getItem('searchEngine');
  if (searchEngineData) {
    window.setSearchEngine(searchEngineData);
  }

  const darkModeData = window.localStorage.getItem('darkMode');
  if (darkModeData) {
    if (darkModeData === '是') {
      darkModeTag.checked = true;
      disableDarkMode = false;
    } else {
      darkModeTag.checked = false;
      disableDarkMode = true;
    }
    window.change_darkMode();
  }

  const backgroundImageData = window.localStorage.getItem('backgroundImage');
  const backgroundImageURLData = window.localStorage.getItem('backgroundImageURL');
  if (backgroundImageData) {
    if (backgroundImageData === '每日一图') {
      meiRiYiTuTag.dispatchEvent(new Event('change'));
    } else if (backgroundImageData === '自定义') {
      ziDingYiInputBoxTag.value = backgroundImageURLData;
      ziDingYiTag.dispatchEvent(new Event('change'));
      window.applyBackgroundImage();
    } else if (backgroundImageData === '纯色背景') {
      chunSeBeiJingTag.dispatchEvent(new Event('change'));
    }
  } else {
    meiRiYiTuTag.dispatchEvent(new Event('change'));
  }

  const xianShiDaoHangData = window.localStorage.getItem('xianShiDaoHang');
  if (xianShiDaoHangData) {
    xianShiDaoHang = xianShiDaoHangData === '是';
  } else {
    xianShiDaoHang = true;
  }
  window.change_xianShiDaoHang();

  for (let j = 0; j < beControlledElementIds.length; j++) {
    const data = window.localStorage.getItem(beControlledElementIds[j]);
    if (data) {
      elementData[beControlledElementIds[j]].show = data === '是';
    } else {
      elementData[beControlledElementIds[j]].show = true;
    }
    window.changeElementHideOrShow(beControlledElementIds[j]);
  }
})();
