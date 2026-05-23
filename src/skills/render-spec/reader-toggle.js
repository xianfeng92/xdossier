(function(){
  var html = document.documentElement;
  var toggle = document.querySelector(".reader-toggle");

  function updatePill() {
    if (!toggle) return;
    var activeBtn = toggle.querySelector('[aria-pressed="true"]');
    if (activeBtn) {
      toggle.style.setProperty("--pill-left", activeBtn.offsetLeft + "px");
      toggle.style.setProperty("--pill-width", activeBtn.offsetWidth + "px");
    }
  }

  function setReader(value){
    if(value !== "beginner" && value !== "intermediate" && value !== "expert") return;
    html.setAttribute("data-reader", value);
    try {
      localStorage.setItem("dossier.reader", value);
    } catch(e) {}
    var btns = document.querySelectorAll("[data-reader-set]");
    for(var i = 0; i < btns.length; i++){
      btns[i].setAttribute("aria-pressed", btns[i].getAttribute("data-reader-set") === value ? "true" : "false");
    }
    updatePill();
  }

  var fromUrl = null;
  try {
    var url = new URL(location.href);
    fromUrl = url.searchParams.get("reader");
  } catch(e) {}

  var fromStorage = null;
  try {
    fromStorage = localStorage.getItem("dossier.reader");
  } catch(e) {}

  setReader(fromUrl || fromStorage || html.getAttribute("data-reader") || "beginner");

  document.addEventListener("click", function(e){
    var target = e.target;
    while(target && target !== document.body){
      if(target.getAttribute && target.getAttribute("data-reader-set")){
        setReader(target.getAttribute("data-reader-set"));
        return;
      }
      target = target.parentNode;
    }
  });

  // Handle pill initialization and resize
  if (toggle) {
    setTimeout(updatePill, 0);
    // Also update on transition end to ensure accuracy if layout shifts
    toggle.addEventListener("transitionend", updatePill);
    window.addEventListener("resize", updatePill);
  }
})();
