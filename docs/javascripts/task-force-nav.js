(function () {
  function hideNavItem(link) {
    var item = link && link.closest(".md-nav__item");

    if (item) {
      item.style.display = "none";
    }
  }

  function applyTaskForceNav() {
    var path = window.location.pathname.replace(/\/+$/, "/");
    var primaryNav = document.querySelector(".md-sidebar--primary");

    if (!primaryNav || path !== "/task-forces/") {
      return;
    }

    primaryNav
      .querySelectorAll('a[href$="/participant-roster/"], a[href="./age-assurance/participant-roster/"]')
      .forEach(hideNavItem);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(applyTaskForceNav);
  } else {
    document.addEventListener("DOMContentLoaded", applyTaskForceNav);
  }
})();
