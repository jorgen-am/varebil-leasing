
<!-- =============================== -->
<!-- 1. Modul: Verktøy og Favoritter -->
<!-- =============================== -->
<script id="js-utils-favorites">
// --- HJELPEFUNKSJONER ---
function getFavorites() {
    return JSON.parse(localStorage.getItem('car_favorites')) || [];
}

function getSelectedCars() {
    return JSON.parse(localStorage.getItem('selected_cars') || '[]');
}

function toggleFaq(element) {
    const allCards = document.querySelectorAll('.faq-card');
    allCards.forEach(card => {
        if (card !== element && card.classList.contains('open')) {
            card.classList.remove('open');
        }
    });
    element.classList.toggle('open');
}

// --- FAVORITT-LOGIKK ---
function toggleFavorite(slug, button, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!slug || slug === "undefined" || slug === "") {
        slug = button.getAttribute('data-slug') || button.closest('[data-slug]')?.dataset.slug;
    }
    if (!slug) return;

    let favorites = getFavorites().filter(item => item && item !== "");
    const heart = button.querySelector('.heart-icon');
    const index = favorites.indexOf(slug);
    
    if (index > -1) {
        favorites.splice(index, 1);
        button.classList.remove('is-favorite');
        if (heart) heart.innerText = '♡';
    } else {
        favorites.push(slug);
        button.classList.add('is-favorite');
        if (heart) heart.innerText = '♥';
    }
    localStorage.setItem('car_favorites', JSON.stringify(favorites));
}

function updateFavoriteUI() {
    const favorites = getFavorites();
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const slug = btn.getAttribute('data-slug') || btn.closest('[data-slug]')?.dataset.slug;
        if (slug && favorites.includes(slug)) {
            btn.classList.add('is-favorite');
            const heart = btn.querySelector('.heart-icon');
            if (heart) heart.innerText = '♥';
        } else {
            btn.classList.remove('is-favorite');
            const heart = btn.querySelector('.heart-icon');
            if (heart) heart.innerText = '♡';
        }
    });
}

function checkEmptyFavs() {
    const container = document.getElementById('favorites-container');
    if (container && container.children.length === 0) {
        container.innerHTML = "<p>Du har ikke lagret noen favoritter ennå.</p>";
    }
}
</script>

<!-- =============================== -->
<!-- 2. Modul: Sammenligning -->
<!-- =============================== -->

<script id="js-comparison">
function toggleSelection(slug, img, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    let selected = getSelectedCars();
    const index = selected.findIndex(item => item.slug === slug);
    if (index > -1) {
        selected.splice(index, 1);
    } else {
        selected.push({ slug, img });
    }
    localStorage.setItem('selected_cars', JSON.stringify(selected));
    updateSelectionUI();
}

function removeFromCompare(slug, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    let selected = getSelectedCars().filter(car => car.slug !== slug);
    localStorage.setItem('selected_cars', JSON.stringify(selected));
    updateSelectionUI();
    if (typeof renderComparison === "function") renderComparison(); 
}

function closeSelectionBar() {
    const bar = document.getElementById('selection-bar');
    if (bar) bar.style.display = 'none';
}

function updateSelectionUI() {
    const selected = getSelectedCars();
    const bar = document.getElementById('selection-bar');
    const container = document.getElementById('selection-items');
    const countSpan = document.getElementById('selection-count');
    if (!bar || !container) return;

    bar.style.display = selected.length > 0 ? 'flex' : 'none';
    if (countSpan) countSpan.innerText = selected.length;

    container.innerHTML = selected.map(car => `
        <div class="selected-item">
            <img src="${car.img}">
            <button onclick="toggleSelection('${car.slug}', '${car.img}', event)" class="remove-item">×</button>
        </div>
    `).join('');

    document.querySelectorAll('.select-btn').forEach(btn => {
        const isSelected = selected.some(item => item.slug === btn.dataset.slug);
        isSelected ? btn.classList.add('selected') : btn.classList.remove('selected');
    });
}

function renderComparison() {
    const selected = getSelectedCars();
    const data = window.globalCarData;
    const grid = document.getElementById('compare-grid');
    const loader = document.getElementById('compare-loader');
    const emptyMsg = document.getElementById('compare-empty');

    if (!data || selected.length === 0) {
        if (loader) loader.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (grid) grid.style.display = 'none';
        return;
    }

    const carsToCompare = selected.map(sel => data.find(c => c.slug === sel.slug)).filter(Boolean);
    if (carsToCompare.length > 0) {
        buildCompareTable(carsToCompare);
        if (loader) loader.style.display = 'none';
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (grid) grid.style.display = 'grid';
    }
}

function buildCompareTable(cars) {
    const grid = document.getElementById('compare-grid');
    if (!grid) return;
    grid.innerHTML = ''; 

    const specsToShow = [
        { label: 'Pris', key: 'pris', suffix: ',-' },
        { label: 'Rekkevidde', key: 'range', suffix: ' km' },
        { label: 'Hengerfeste', key: 'towbar', isBoolean: true },
        { label: 'Drivstoff', key: 'fuel' },
        { label: 'Girkasse', key: 'gear' },
        { label: 'Årsmodell', key: 'yearmodel' }
    ];

    cars.forEach(car => {
        let specsHtml = specsToShow.map(spec => {
            let val = car[spec.key];
            if (!val) val = '—';
            else if (spec.isBoolean) val = (val === true || val === "true") ? 'Ja' : 'Nei';
            else if (spec.suffix) val = val + spec.suffix;
            return `<li><strong>${spec.label}:</strong> ${val}</li>`;
        }).join('');

        grid.innerHTML += `
            <a href="${car.permalink}" class="car-card" data-slug="${car.slug}">
                <button class="favorite-btn" data-slug="${car.slug}" onclick="toggleFavorite('${car.slug}', this, event)"></button>
                <button onclick="removeFromCompare('${car.slug}', event)" class="remove-btn">X</button>
                <div class="car-card-img-container"><img src="${car.bilde}"></div>
                <div class="car-card-content">
                    <h3>${car.merke || ''} ${car.title}</h3>
                    <ul class="car-specs-list" style="list-style:none; padding:0;">${specsHtml}</ul>
                    <div class="card-footer"><span class="read-more">Se detaljer</span></div>
                </div>
            </a>`;
    });
}
</script>

<!-- =============================== -->
<!-- 3. Modul: Søk og Favoritt-visning -->
<!-- =============================== -->

<script id="js-search-favorites-render">
function setupSearch(data, input) {
    const resultsList = document.getElementById('search-results');
    const fuse = new Fuse(data, { keys: ['title', 'merke', 'modell'], threshold: 0.3 });

    input.addEventListener('input', () => {
        const results = fuse.search(input.value);
        const favorites = getFavorites();
        resultsList.innerHTML = ''; 
        results.forEach(result => {
            const item = result.item;
            const isFav = favorites.includes(item.slug);
            resultsList.innerHTML += `
                <li class="car-card-mini">
                    <img src="${item.bilde}" style="width: 50px;">
                    <a href="${item.permalink}"><strong>${item.merke || ''} ${item.title}</strong></a>
                    <button class="favorite-btn ${isFav ? 'is-favorite' : ''}" onclick="toggleFavorite('${item.slug}', this, event)">
                        <span class="heart-icon">${isFav ? '♥' : '♡'}</span>
                    </button>
                </li>`;
        });
    });
}

function renderFavorites(allCars, container) {
    const favSlugs = getFavorites();
    if (favSlugs.length === 0) {
        container.innerHTML = '<p>Du har ikke lagret noen favoritter ennå.</p>';
        return;
    }
    const favoriteCars = allCars.filter(car => favSlugs.includes(car.slug));
    container.innerHTML = '';
    favoriteCars.forEach(item => {
        container.innerHTML += `
            <div class="car-card" data-slug="${item.slug}">
                <img src="${item.bilde}">
                <div class="car-card-content">
                    <h3>${item.merke || ''} ${item.title}</h3>
                    <button class="favorite-btn is-favorite" onclick="toggleFavorite('${item.slug}', this, event); this.closest('.car-card').remove(); checkEmptyFavs();">
                        <span class="heart-icon">♥</span> <i>Fjern</i>
                    </button>
                </div>
            </div>`;
    });
}
</script>

<!-- =============================== -->
<!-- 4. Modul: Main (Oppstart) -->
<!-- =============================== -->

<script id="js-main-init">
document.addEventListener('DOMContentLoaded', () => {
    // 1. Umiddelbar UI-oppdatering fra localStorage
    updateFavoriteUI();
    updateSelectionUI();

    // 2. Globale lyttere
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
        }
    });

    // 3. Henting av data og kontekst-spesifikk rendering
    const jsonPath = window.location.origin + '/varebil-leasing/index.json';
    fetch(jsonPath)
        .then(response => response.ok ? response.json() : Promise.reject())
        .then(data => {
            window.globalCarData = data;
            
            // Kjør funksjoner basert på hvilken side vi er på
            if (window.location.href.includes('sammenlign')) renderComparison();

            const searchInput = document.getElementById('search-input');
            if (searchInput) setupSearch(data, searchInput);

            const favContainer = document.getElementById('favorites-container');
            if (favContainer) renderFavorites(data, favContainer);
        })
        .catch(err => console.error("Data-feil:", err));
});
</script>