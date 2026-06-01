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

    if (!primaryNav) {
      return;
    }

    primaryNav.querySelectorAll(".md-nav__item").forEach(function (item) {
      item.style.display = "";
    });

    if (path === "/task-forces/") {
      primaryNav
        .querySelectorAll('a[href$="/participant-roster/"], a[href="./age-assurance/participant-roster/"]')
        .forEach(hideNavItem);
    }

    if (path.indexOf("/task-forces/age-assurance/") === 0) {
      primaryNav
        .querySelectorAll('a[href$="/trust-registries/"], a[href="../trust-registries/"], a[href="../../trust-registries/"]')
        .forEach(hideNavItem);
    }
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(applyTaskForceNav);
  } else {
    document.addEventListener("DOMContentLoaded", applyTaskForceNav);
  }
})();
