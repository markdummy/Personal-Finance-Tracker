const Navbar = {
  template: `
    <header>
      <nav class="navbar">
        <a href="PATH_PREFIX/index.html" data-page="dashboard"><img src="LOGO_PATH/assets/logo.png" class="logo" alt="logo" /></a>
        <a href="PATH_PREFIX/index.html" data-page="dashboard" class="logo-text">FINANCE TRACKER</a>
        <ul class="nav-list">
          <li class="nav-item"><a href="PATH_PREFIX/index.html" data-page="dashboard">Dashboard</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/budget.html" data-page="budget">Budget</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/income.html" data-page="income">Income</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/expenses.html" data-page="expenses">Expenses</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/reports.html" data-page="reports">Reports</a></li>
        </ul>
        <button class="hamburger" aria-label="Toggle navigation" aria-expanded="false">
          <span class="hamburger__bar"></span>
          <span class="hamburger__bar"></span>
          <span class="hamburger__bar"></span>
        </button>
      </nav>
      <div class="mobile-menu" aria-hidden="true">
        <ul class="mobile-nav-list">
          <li class="nav-item"><a href="PATH_PREFIX/index.html" data-page="dashboard">Dashboard</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/budget.html" data-page="budget">Budget</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/income.html" data-page="income">Income</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/expenses.html" data-page="expenses">Expenses</a></li>
          <li class="nav-item"><a href="PATH_PREFIX/pages/reports.html" data-page="reports">Reports</a></li>
        </ul>
      </div>
    </header>
  `,

  render(currentPage = "", pathPrefix = "") {
    let html = this.template
      .replace(/PATH_PREFIX\//g, pathPrefix)
      .replace("LOGO_PATH/", pathPrefix);

    document.body.insertAdjacentHTML("afterbegin", html);

    if (currentPage) {
      this.setActivePage(currentPage);
    }

    this.initHamburger();
  },

  setActivePage(pageName) {
    const links = document.querySelectorAll(".nav-item a");
    links.forEach((link) => {
      if (link.dataset.page === pageName) {
        link.classList.add("active");
        link.parentElement.classList.add("active");
      }
    });
  },

  initHamburger() {
    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.querySelector(".mobile-menu");

    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("mobile-menu--open");
      hamburger.classList.toggle("hamburger--open", isOpen);
      hamburger.setAttribute("aria-expanded", isOpen);
      mobileMenu.setAttribute("aria-hidden", !isOpen);
    });

    mobileMenu.querySelectorAll(".mobile-nav-list a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("mobile-menu--open");
        hamburger.classList.remove("hamburger--open");
        hamburger.setAttribute("aria-expanded", false);
        mobileMenu.setAttribute("aria-hidden", true);
      });
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const currentPage = body.dataset.page;
  const pathPrefix = body.dataset.pathPrefix || "";

  if (currentPage) {
    Navbar.render(currentPage, pathPrefix);
  }
});
