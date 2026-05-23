// Category definitions
var CATEGORIES = [
  { key: 'hot',      label: '热点',   buttonId: 'navClass_hot_button' },
  { key: 'news',     label: '资讯',   buttonId: 'navClass_news_button' },
  { key: 'community',label: '社区',   buttonId: 'navClass_community_button' },
  { key: 'video',    label: '视频',   buttonId: 'navClass_video_button' },
  { key: 'game',     label: '游戏',   buttonId: 'navClass_game_button' },
  { key: 'tool',     label: '工具',   buttonId: 'navClass_tool_button' },
  { key: 'music',    label: '音乐',   buttonId: 'navClass_music_button' },
  { key: 'image',    label: '图片',   buttonId: 'navClass_image_button' },
  { key: 'fiction',  label: '小说',   buttonId: 'navClass_fiction_button' },
  { key: 'comic',    label: '漫画',   buttonId: 'navClass_comic_button' },
  { key: 'wiki',     label: '维基',   buttonId: 'navClass_wiki_button' },
  { key: 'merch',    label: '周边',   buttonId: 'navClass_merch_button' },
  { key: 'resource', label: '资源',   buttonId: 'navClass_resource_button' }
];

var navLinksContainer = document.getElementById('navLinksContainer');
var currentCategory = 'hot';
var allLinks = {};        // category -> [links]
var hotLinks = [];        // hot links cache
var buttons = {};         // category -> button element

// Initialize button references
for (var i = 0; i < CATEGORIES.length; i++) {
  var cat = CATEGORIES[i];
  buttons[cat.key] = document.getElementById(cat.buttonId);
}

// Fetch with timeout helper
function fetchWithTimeout(url, options, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, timeoutMs || 10000);
  var fetchOptions = options || {};
  fetchOptions.signal = controller.signal;
  return fetch(url, fetchOptions).finally(function() { clearTimeout(timer); });
}

// Fetch all links from API
function loadAllLinks() {
  fetchWithTimeout('/api/links', null, 10000)
    .then(function(res) { return res.json(); })
    .then(function(links) {
      allLinks = {};
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        if (!allLinks[link.category]) {
          allLinks[link.category] = [];
        }
        allLinks[link.category].push(link);
      }
      // Render default category (hot is handled by loadHotLinks)
      if (currentCategory !== 'hot') {
        renderCategory(currentCategory);
      }
    })
    .catch(function(err) {
      console.error('Failed to load links:', err);
      navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">加载失败，请刷新页面重试</div>';
    });
}

// Fetch hot links
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

// Switch category
function changeCategory(category) {
  currentCategory = category;
  if (category === 'hot') {
    loadHotLinks();
  } else {
    if (allLinks[category]) {
      renderCategory(category);
    } else {
      // Data not loaded yet, show loading
      navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">加载中...</div>';
      // Data will render when loadAllLinks completes
    }
  }
  updateNavButtons(category);
}

// Render links for a regular category
function renderCategory(category) {
  var links = allLinks[category] || [];
  if (links.length === 0) {
    navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无链接</div>';
    return;
  }
  navLinksContainer.innerHTML = buildLinkCards(links, false);
}

// Render hot links with click counts
function renderHotLinks(links) {
  if (links.length === 0) {
    navLinksContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">暂无热点</div>';
    return;
  }
  navLinksContainer.innerHTML = buildLinkCards(links, true);
}

// Build HTML for link cards
function buildLinkCards(links, showCount) {
  var html = '';
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var countHtml = '';
    if (showCount && link.click_count > 0) {
      countHtml = '<span style="font-size:12px;color:#ff9800;margin-left:8px;">'
        + link.click_count + ' 次点击</span>';
    }
    html +=
      '<a href="' + link.url + '" target="_blank" onclick="recordClick(' + link.id + ', event)">' +
      '  <nav_link>' +
      '    <nav_link_left>' +
      '      <img src="' + link.icon + '" class="icon" onerror="this.src=\'./assets/website.png\'">' +
      '    </nav_link_left>' +
      '    <nav_link_right>' +
      '      <nav_link_title>' + escapeHtml(link.title) + countHtml + '</nav_link_title>' +
      '      <nav_link_description>' + escapeHtml(link.description) + '</nav_link_description>' +
      '    </nav_link_right>' +
      '  </nav_link>' +
      '</a>';
  }
  return html;
}

// Record click — uses keepalive so the request completes even after navigation
function recordClick(linkId, event) {
  fetch('/api/links/' + linkId + '/click', {
    method: 'POST',
    keepalive: true
  }).catch(function() {
    // Silently ignore click tracking errors
  });
}

// Update nav button active states
function updateNavButtons(category) {
  for (var key in buttons) {
    if (buttons[key]) {
      if (key === category) {
        buttons[key].style.borderBottom = '3px solid #a3def8';
        buttons[key].style.color = key === 'hot' ? '#ff9800' : '#a3def8';
      } else {
        buttons[key].style.borderBottom = '3px solid #ffffff00';
        buttons[key].style.color = key === 'hot' ? '#ff9800' : 'white';
      }
    }
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// Initialize: load hot links as default category
loadHotLinks();
loadAllLinks();
updateNavButtons('hot');
