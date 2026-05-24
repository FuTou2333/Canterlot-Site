var navLinksContainer = document.getElementById('navLinksContainer');
var navSelect = document.getElementById('navSelect');
var currentCategory = 'hot';
var allLinks = {};        // category -> [links]
var hotLinks = [];        // hot links cache
var buttons = {};         // category -> button element

// Fetch with timeout helper
function fetchWithTimeout(url, options, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, timeoutMs || 10000);
  var fetchOptions = options || {};
  fetchOptions.signal = controller.signal;
  return fetch(url, fetchOptions).finally(function() { clearTimeout(timer); });
}

// Fetch categories from API and build nav buttons
function loadCategories() {
  fetchWithTimeout('/api/categories', null, 10000)
    .then(function(res) { return res.json(); })
    .then(function(categories) {
      buildNavButtons(categories);
      // Now that buttons exist, load links
      loadHotLinks();
      loadAllLinks();
      updateNavButtons('hot');
    })
    .catch(function(err) {
      console.error('Failed to load categories:', err);
    });
}

// Build nav button elements dynamically
function buildNavButtons(categories) {
  var html = '<a class="nav_select_links" id="navClass_hot_button" onclick="changeCategory(\'hot\')" style="color:#ff9800">热点</a>';
  buttons = {};
  buttons['hot'] = null; // will resolve after innerHTML

  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    html += '<a class="nav_select_links" id="navClass_' + cat.key + '_button" onclick="changeCategory(\'' + cat.key + '\')">' + escapeHtml(cat.label) + '</a>';
  }

  navSelect.innerHTML = html;

  // Re-initialize button references
  buttons['hot'] = document.getElementById('navClass_hot_button');
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    buttons[cat.key] = document.getElementById('navClass_' + cat.key + '_button');
  }
}

// Fetch all links from API
function loadAllLinks() {
  fetchWithTimeout('/api/links', null, 10000)
    .then(function(res) { return res.json(); })
    .then(function(links) {
      allLinks = {};
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var categories = link.categories || [];
        for (var j = 0; j < categories.length; j++) {
          var cat = categories[j];
          if (!allLinks[cat]) {
            allLinks[cat] = [];
          }
          allLinks[cat].push(link);
        }
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
  navLinksContainer.innerHTML = buildLinkCards(links, true);
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
      countHtml = '<span style="font-size:12px;color:#ff9800;margin-left:8px;">🔥'
        + link.click_count + '</span>';
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
        buttons[key].style.borderBottom = '3px solid rgb(70, 134, 163)';
        buttons[key].style.color = key === 'hot' ? '#ff9800' : 'rgb(70, 134, 163)';
      } else {
        buttons[key].style.borderBottom = '3px solid #ffffff00';
        buttons[key].style.color = key === 'hot' ? '#ff9800' : '';
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

// Initialize: load categories, then links
loadCategories();
