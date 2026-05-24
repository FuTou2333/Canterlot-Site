(function() {
  'use strict';

  const menu = document.querySelector('.menu');
  let menuHeight = 0;

  window.openMenu = function(event) {
    event.stopPropagation();
    if (menuHeight === 0) {
      menu.style.height = 'auto';
      menuHeight = menu.offsetHeight;
      menu.style.height = '0';
    }
    menu.style.height = menuHeight + 'px';
    menu.classList.add('is-active');
  };

  window.closeMenu = function() {
    menu.style.height = '0';
    menu.classList.remove('is-active');
  };
})();
