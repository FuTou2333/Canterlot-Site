(function() {
  'use strict';

  const navLinksContainer = document.getElementById('navLinksContainer');
  const navSelect = document.getElementById('navSelect');
  let currentCategory = window.localStorage.getItem('currentCategory') || 'hot';
  let allLinks = {};        // 分类 -> [链接]
  let hotLinks = [];        // 热点链接缓存
  let buttons = {};         // 分类 -> 按钮元素

  function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function() { controller.abort(); }, timeoutMs || 10000);
    const fetchOptions = options || {};
    fetchOptions.signal = controller.signal;
    return fetch(url, fetchOptions).finally(function() { clearTimeout(timer); });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  function buildLinkCards(links, showCount) {
    let html = '';
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      let countHtml = '';
      if (showCount && link.click_count > 0) {
        countHtml = '<span style="font-size:12px;color:#ff9800;margin-left:8px;">🔥'
          + link.click_count + '</span>';
      }
      const safeUrl = /^(https?|ftp):\/\//i.test(link.url) ? link.url : '#';
      html +=
        '<a href="' + safeUrl + '" target="_blank" rel="noopener" onclick="recordClick(' + link.id + ', event)">' +
        '  <div class="nav_link">' +
        '    <div class="nav_link_left">' +
        '      <img src="' + link.icon + '" class="icon" onerror="this.src=\'./assets/website.png\'">' +
        '    </div>' +
        '    <div class="nav_link_right">' +
        '      <div class="nav_link_title">' + escapeHtml(link.title) + countHtml + '</div>' +
        '      <div class="nav_link_description">' + escapeHtml(link.description) + '</div>' +
        '    </div>' +
        '  </div>' +
        '</a>';
    }
    return html;
  }

  function renderCategory(category) {
    const links = allLinks[category] || [];
    if (links.length === 0) {
      navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无链接</div>';
      return;
    }
    navLinksContainer.innerHTML = buildLinkCards(links, true);
  }

  function renderHotLinks(links) {
    if (links.length === 0) {
      navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无热点</div>';
      return;
    }
    navLinksContainer.innerHTML = buildLinkCards(links, true);
  }

  function updateNavButtons(category) {
    for (const key in buttons) {
      if (buttons[key]) {
        if (key === category) {
          buttons[key].style.borderBottom = '3px solid rgb(70, 134, 163)';
          buttons[key].style.color = key === 'hot' ? '#ff9800' : 'rgb(70, 134, 163)';
        } else {
          buttons[key].style.borderBottom = '3px solid #ffffff00';
          buttons[key].style.color = key === 'hot' ? '#ff9800' : '';
        }
      }
    }
  }

  function buildNavButtons(categories) {
    let html = '<a class="nav_select_links" id="navClass_hot_button" onclick="changeCategory(\'hot\')" style="color:#ff9800">热点</a>';
    buttons = {};
    buttons['hot'] = null;

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      html += '<a class="nav_select_links" id="navClass_' + cat.key + '_button" onclick="changeCategory(\'' + cat.key + '\')">' + escapeHtml(cat.label) + '</a>';
    }

    navSelect.innerHTML = html;

    buttons['hot'] = document.getElementById('navClass_hot_button');
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      buttons[cat.key] = document.getElementById('navClass_' + cat.key + '_button');
    }
  }

  function loadHotLinks() {
    fetchWithTimeout('/api/links/hot', null, 10000)
      .then(function(res) { return res.json(); })
      .then(function(links) {
        hotLinks = links;
        renderHotLinks(links);
      })
      .catch(function(err) {
        console.error('Failed to load hot links:', err);
        navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">加载失败，请刷新页面重试</div>';
      });
  }

  function loadAllLinks() {
    fetchWithTimeout('/api/links', null, 10000)
      .then(function(res) { return res.json(); })
      .then(function(links) {
        allLinks = {};
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          const categories = link.categories || [];
          for (let j = 0; j < categories.length; j++) {
            const cat = categories[j];
            if (!allLinks[cat]) {
              allLinks[cat] = [];
            }
            allLinks[cat].push(link);
          }
        }
        if (currentCategory !== 'hot') {
          renderCategory(currentCategory);
        }
      })
      .catch(function(err) {
        console.error('Failed to load links:', err);
        navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">加载失败，请刷新页面重试</div>';
      });
  }

  function loadCategories() {
    fetchWithTimeout('/api/categories', null, 10000)
      .then(function(res) { return res.json(); })
      .then(function(categories) {
        buildNavButtons(categories);
        loadAllLinks();
        if (currentCategory === 'hot') {
          loadHotLinks();
        }
        updateNavButtons(currentCategory);
      })
      .catch(function(err) {
        console.error('Failed to load categories:', err);
        navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">加载失败，请刷新页面重试</div>';
      });
  }

  window.changeCategory = function(category) {
    currentCategory = category;
    window.localStorage.setItem('currentCategory', category);
    if (category === 'hot') {
      loadHotLinks();
    } else {
      if (allLinks[category]) {
        renderCategory(category);
      } else {
        navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">加载中...</div>';
      }
    }
    updateNavButtons(category);
  };

  window.recordClick = function(linkId, event) {
    fetch('/api/links/' + linkId + '/click', {
      method: 'POST',
      keepalive: true
    }).catch(function() {
      // 静默忽略点击统计错误
    });
  };

  // 初始化
  loadCategories();
})();
