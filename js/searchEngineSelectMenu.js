window.onload = () => {
  const menu = document.querySelector('.menu')
  const menuHeight = menu.offsetHeight - parseInt(getComputedStyle(menu)['paddingTop']) - parseInt(getComputedStyle(menu)['paddingBottom'])
  menu.style.height = '0'

  openMenu = () => {
    menu.style.height = `${menuHeight}px`
    menu.classList.add('is-active')
  }

  closeMenu = () => {
    menu.style.height = '0'
    menu.classList.remove('is-active')
  }

}