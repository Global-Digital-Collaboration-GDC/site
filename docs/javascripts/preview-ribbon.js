(function () {
  var PREVIEW_HOSTS = [
    "preview.gdc26-hub.pages.dev",
    "gdc26-hub-preview.pages.dev",
  ];

  function isPreviewHost(hostname) {
    return (
      PREVIEW_HOSTS.indexOf(hostname) !== -1 ||
      hostname.indexOf("preview.gdc26-hub.pages.dev") !== -1
    );
  }

  function applyPreviewRibbon() {
    if (!isPreviewHost(window.location.hostname)) {
      return;
    }

    if (document.querySelector(".gdc-preview-ribbon")) {
      return;
    }

    var ribbon = document.createElement("div");
    ribbon.className = "gdc-preview-ribbon";
    ribbon.textContent = "Preview";
    document.body.appendChild(ribbon);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(applyPreviewRibbon);
  } else {
    document.addEventListener("DOMContentLoaded", applyPreviewRibbon);
  }
})();
