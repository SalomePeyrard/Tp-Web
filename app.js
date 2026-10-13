const API_URL = "https://hp-api.onrender.com/api";
const CHARACTERS_LIMIT = 20;
const UNKNOWN_VALUE = "Non renseigné";
const HOUSE_CRESTS = {
  gryffindor: "Gryffindor.png",
  hufflepuff: "Hufflepuff.png",
  ravenclaw: "Ravenclaw.png",
  slytherin: "Slytherin.png",
};
const HOUSE_NAMES = {
  gryffindor: "Gryffondor",
  hufflepuff: "Poufsouffle",
  ravenclaw: "Serdaigle",
  slytherin: "Serpentard",
};
const CHARACTER_NAME_COLLATOR = new Intl.Collator("fr", { sensitivity: "base" });

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function getValue(value) {
  return value === null || value === undefined || value === ""
    ? UNKNOWN_VALUE
    : String(value);
}

function getHouseClass(house) {
  const normalizedHouse = String(house || "").toLowerCase();
  return Object.hasOwn(HOUSE_CRESTS, normalizedHouse)
    ? `house-${normalizedHouse}`
    : "house-unknown";
}

function getImageUrl(image) {
  if (typeof image !== "string" || image.trim() === "") {
    return "";
  }

  try {
    const url = new URL(image);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

async function fetchCharacters(endpoint = `${API_URL}/characters`) {
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`L’API statut ${response.status}.`);
  }

  const characters = await response.json();
  if (!Array.isArray(characters)) {
    throw new Error("erreur");
  }

  return characters;
}

function imageMarkup(character, className = "character-image") {
  const imageUrl = getImageUrl(character.image);
  if (!imageUrl) {
    return `<div class="image-placeholder" role="img" aria-label="Portrait indisponible">Portrait indisponible</div>`;
  }

  return `<img class="${className}" src="${escapeHtml(imageUrl)}" alt="Portrait de ${escapeHtml(getValue(character.name))}" data-image-fallback />`;
}

function addImageFallbacks(container) {
  container.querySelectorAll("[data-image-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "image-placeholder";
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute("aria-label", "Portrait indisponible");
      placeholder.textContent = "Portrait indisponible";
      image.replaceWith(placeholder);
    }, { once: true });
  });
}

async function renderCharacters() {
  const list = document.querySelector("#characters-list");
  const status = document.querySelector("#characters-status");
  const houseButtons = document.querySelectorAll("[data-house]");

  try {
    const characters = await fetchCharacters();
    const firstCharacters = characters.slice(0, CHARACTERS_LIMIT);

    let selectedHouse = null;

    function displayCharacters() {
      const visibleCharacters = selectedHouse
        ? firstCharacters
          .filter((character) => String(character?.house || "").toLowerCase() === selectedHouse)
          .sort((first, second) => CHARACTER_NAME_COLLATOR.compare(
            getValue(first?.name),
            getValue(second?.name),
          ))
        : firstCharacters;

      list.innerHTML = visibleCharacters.map((character) => {
        const name = getValue(character?.name);
        const characterClass = getHouseClass(character?.house);
        const aliveClass = character?.alive === false ? " character-deceased" : "";
        const contents = `${imageMarkup(character || {})}<p>${escapeHtml(name)}</p>`;

        return `<div class="${characterClass}${aliveClass}">${character?.id
          ? `<a href="./details.html?id=${encodeURIComponent(character.id)}" aria-label="Voir la fiche de ${escapeHtml(name)}">${contents}</a>`
          : contents}</div>`;
      }).join("");
      addImageFallbacks(list);

      houseButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.house === selectedHouse));
      });

      status.textContent = "";
    }

    houseButtons.forEach((button) => {
      button.addEventListener("click", () => {
        selectedHouse = selectedHouse === button.dataset.house ? null : button.dataset.house;
        displayCharacters();
      });
    });

    displayCharacters();
  } catch (error) {
    console.error("Impossible de charger les personnages depuis HP-API.", error);
    status.textContent = "Impossible de charger les personnages. Vérifiez votre connexion puis rechargez la page.";
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = getValue(value);
  }
}

function displayCharacter(character) {
  const name = getValue(character.name);
  const heading = document.querySelector("#character-title");
  const image = document.querySelector("#character-image");
  const actor = document.querySelector("#character-actor");
  const house = String(character.house || "").toLowerCase();
  const crest = HOUSE_CRESTS[house];
  const crestSection = document.querySelector("#character-house-crest");

  image.classList.toggle("is-deceased", character.alive === false);
  heading.textContent = name;
  document.title = `${name} | Wiki Harry Potter`;
  setText("#character-actor", character.actor);
  setText("#character-house", character.house);
  setText("#character-gender", character.gender);
  setText(
    "#character-nicknames",
    Array.isArray(character.alternate_names) && character.alternate_names.length > 0
      ? character.alternate_names.join(", ")
      : null,
  );
  setText("#character-birth", character.dateOfBirth);
  setText("#character-patronus", character.patronus);
  setText("#character-eyes", character.eyeColour);
  setText(
    "#character-alive",
    typeof character.alive === "boolean"
      ? (character.alive ? "Vivant" : "Décédé")
      : UNKNOWN_VALUE,
  );

  const imageUrl = getImageUrl(character.image);
  if (imageUrl) {
    image.src = imageUrl;
    image.alt = `Portrait de ${name}`;
    image.hidden = false;
    image.addEventListener("error", () => {
      image.hidden = true;
      const placeholder = document.createElement("div");
      placeholder.className = "image-placeholder";
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute("aria-label", "Portrait indisponible");
      placeholder.textContent = "Portrait indisponible";
      image.insertAdjacentElement("afterend", placeholder);
    }, { once: true });
  } else {
    image.hidden = true;
    const placeholder = document.createElement("div");
    placeholder.className = "image-placeholder";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", "Portrait indisponible");
    placeholder.textContent = "Portrait indisponible";
    image.insertAdjacentElement("afterend", placeholder);
  }

  actor.textContent = getValue(character.actor);
  if (crest) {
    crestSection.innerHTML = `<img src="./${crest}" alt="Blason de ${escapeHtml(getValue(character.house))}" />`;
  } else {
    crestSection.textContent = "";
    crestSection.setAttribute("aria-hidden", "true");
  }
}

async function renderCharacterDetails() {
  const status = document.querySelector("#character-status");
  const characterId = new URLSearchParams(window.location.search).get("id");

  try {
    const characters = await fetchCharacters(
      characterId
        ? `${API_URL}/character/${encodeURIComponent(characterId)}`
        : `${API_URL}/characters`,
    );
    const character = characters[0];

    if (!character) {
      throw new Error("Aucun personnage correspondant n’a été trouvé dans l’API.");
    }

    displayCharacter(character);
    status.textContent = "";
  } catch (error) {
    console.error("Impossible de charger la fiche depuis HP-API.", error);
    status.textContent = "Impossible de charger cette fiche personnage. Vérifiez votre connexion et le lien, puis réessayez.";
  }
}

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute("aria-label", isExpanded ? "Ouvrir le menu" : "Fermer le menu");
    siteNav.hidden = isExpanded;
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      siteNav.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !siteNav.hidden) {
      siteNav.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Ouvrir le menu");
      menuToggle.focus();
    }
  });
}

if (document.querySelector("#characters-list")) {
  renderCharacters();
} else if (document.querySelector("#character-status")) {
  renderCharacterDetails();
}
