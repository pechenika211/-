/*jslint browser */
/*global THREE, Islands */

// Адрес сервиса форм (Formspree / Formcarry). Замените YOUR_FORM_ID на свой.
const FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
const STORAGE_KEY = "archipelag-contact";
const MOBILE_QUERY = "(max-width: 1023px)";
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- Миры-услуги в шапке ---------- */
const WORLDS = [
    {
        bg: "#e3966a",
        bg2: "#b4583a",
        ground: 0xe6a35e,
        meta: "от 3 недель · от 60 000 ₽",
        name: "brand",
        rock: 0x7f4329,
        soil: 0xb8693f,
        text: "Логотип, цвета, шрифты и гайдлайн. Собираем знак, "
        + "который узнают с первого взгляда.",
        title: "Айдентика"
    },
    {
        bg: "#4656ec",
        bg2: "#2531b8",
        ground: 0x4a58e2,
        meta: "от 2 недель · от 45 000 ₽",
        name: "web",
        rock: 0x1d237a,
        soil: 0x2e37a6,
        text: "Лендинги и многостраничные сайты: структура, тексты, "
        + "анимации и макеты, готовые к разработке.",
        title: "Сайты"
    },
    {
        bg: "#7ccac4",
        bg2: "#3a95a0",
        ground: 0x86cf6a,
        meta: "от 4 недель · по оценке",
        name: "ui",
        rock: 0x5e4430,
        soil: 0x8f6a45,
        text: "Приложения и личные кабинеты, в которых не приходится "
        + "искать нужную кнопку.",
        title: "Интерфейсы"
    },
    {
        bg: "#f1a7c8",
        bg2: "#cf6497",
        ground: 0xffc6dc,
        meta: "от 1 недели · от 20 000 ₽",
        name: "motion",
        rock: 0xa95580,
        soil: 0xd889ad,
        text: "Анимированные логотипы, ролики и микроанимации, "
        + "которые оживляют бренд.",
        title: "Моушн"
    }
];

/* ---------- Острова связи ---------- */
const CONTACTS = [
    {
        autocomplete: "off",
        bg: "#55b2f2",
        bg2: "#1f6fc4",
        check: /^@?[A-Za-z0-9_]{4,32}$/,
        error: "Ник в Telegram — латиница, цифры и «_», от 4 символов.",
        ground: 0x9fe38c,
        label: "Ник в Telegram",
        name: "telegram",
        placeholder: "@username",
        rock: 0x3e6a2c,
        soil: 0x6e8f4a,
        title: "Остров Telegram",
        type: "text"
    },
    {
        autocomplete: "email",
        bg: "#b28cf2",
        bg2: "#7246cf",
        check: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        error: "Проверь адрес почты: нужен вид name@mail.ru.",
        ground: 0xe6d6ff,
        label: "E-mail",
        name: "email",
        placeholder: "you@mail.ru",
        rock: 0x6b4aa8,
        soil: 0xa384de,
        title: "Остров Почты",
        type: "email"
    },
    {
        autocomplete: "tel",
        bg: "#5b35d6",
        bg2: "#2a1584",
        check: /^[+\d][\d\s()\-]{9,}$/,
        error: "Нужен номер телефона, например +7 900 000-00-00.",
        ground: 0x4a2fb8,
        label: "Телефон",
        name: "phone",
        placeholder: "+7 900 000-00-00",
        rock: 0x1d0e5c,
        soil: 0x30188a,
        title: "Остров Звонков",
        type: "tel"
    },
    {
        autocomplete: "off",
        bg: "#5fc290",
        bg2: "#2b8a5d",
        check: /^\d{4}-\d{2}-\d{2}$/,
        error: "Выбери дату встречи.",
        ground: 0x9ade7a,
        label: "Удобная дата встречи",
        name: "meeting",
        placeholder: "",
        rock: 0x4f3a26,
        soil: 0x7d5c3c,
        title: "Остров Встреч",
        type: "date"
    }
];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function pad(num) {
    return String(num).padStart(2, "0");
}

function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
}

function easeIn(t) {
    return t * t * t;
}

function easeOutBack(t) {
    const c = 1.5;
    const k = t - 1;
    return 1 + (c + 1) * k * k * k + c * k * k;
}

function wrapAngle(angle) {
    const full = Math.PI * 2;
    return ((angle + Math.PI) % full + full) % full - Math.PI;
}

/* ==========================================================================
   Общая подготовка сцены three.js
   ========================================================================== */
function createStage(canvas, fov) {
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    const sun = new THREE.DirectionalLight(0xfff1dd, 2.1);
    const stage = {camera, renderer, scene, visible: true};

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    sun.position.set(-6, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.bias = -0.0015;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a4a6a, 0.9));

    stage.resize = function () {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    };

    if (window.IntersectionObserver !== undefined) {
        new window.IntersectionObserver(function (entries) {
            stage.visible = entries[0].isIntersecting;
        }).observe(canvas);
    }
    stage.resize();
    window.addEventListener("resize", stage.resize);
    return stage;
}

function holderFor(island, scale) {
    const holder = new THREE.Group();
    island.rotation.y = Math.PI / 4;
    holder.add(island);
    holder.scale.setScalar(scale);
    return holder;
}

/* ==========================================================================
   ШАПКА: миры переворачиваются при переключении (слайдер)
   ========================================================================== */
function initHeroWorlds() {
    const hero = document.querySelector(".hero");
    const canvas = document.getElementById("hero-canvas");
    const ui = {
        counter: hero.querySelector(".world__count"),
        dots: Array.from(hero.querySelectorAll(".world__dot")),
        meta: hero.querySelector(".world__meta"),
        text: hero.querySelector(".world__text"),
        title: hero.querySelector(".world__title")
    };
    const state = {
        current: 0,
        flip: null,
        holders: [],
        pointerX: 0,
        pointerY: 0
    };
    let stage = null;

    function paintUI(index) {
        const world = WORLDS[index];
        hero.style.setProperty("--bg", world.bg);
        hero.style.setProperty("--bg2", world.bg2);
        const total = pad(WORLDS.length);
        ui.counter.textContent = "Мир " + pad(index + 1) + " / " + total;
        ui.title.classList.remove("is-in");
        ui.title.getBoundingClientRect();
        ui.title.textContent = world.title;
        ui.title.classList.add("is-in");
        ui.text.textContent = world.text;
        ui.meta.textContent = world.meta;
        ui.dots.forEach(function (dot, i) {
            dot.classList.toggle("is-active", i === index);
            dot.setAttribute("aria-current", String(i === index));
        });
    }

    function go(index) {
        const next = (index + WORLDS.length) % WORLDS.length;
        if (next === state.current) {
            return;
        }
        if (stage && !REDUCED.matches) {
            state.flip = {
                dir: (
                    next > state.current
                    ? 1
                    : -1
                ),
                from: state.current,
                start: performance.now(),
                to: next
            };
        }
        state.current = next;
        paintUI(next);
    }

    function placeIdle(holder, time) {
        const island = holder.children[0];
        const sway = Math.sin(time * 0.25) * 0.12;
        island.rotation.y = Math.PI / 4 + sway + state.pointerX * 0.25;
        holder.rotation.x = state.pointerY * 0.06;
        holder.position.y = Math.sin(time * 0.8) * 0.08;
    }

    function animateFlip(now) {
        const flip = state.flip;
        const p = clamp((now - flip.start) / 1300, 0, 1);
        const from = state.holders[flip.from];
        const to = state.holders[flip.to];
        let q;

        state.holders.forEach(function (holder, i) {
            holder.visible = i === flip.from || i === flip.to;
        });
        if (p < 0.45) {
            q = easeIn(p / 0.45);
            to.visible = false;
            from.rotation.x = flip.dir * q * 1.9;
            from.position.y -= q * 2.2;
            from.scale.setScalar(1 - q * 0.35);
            Islands.setOpacity(from.children[0], 1 - q);
        } else {
            q = easeOutBack((p - 0.45) / 0.55);
            from.visible = false;
            to.rotation.x = -flip.dir * (1 - q) * 1.9;
            to.position.y -= (1 - q) * 2.2;
            to.scale.setScalar(0.65 + 0.35 * q);
            Islands.setOpacity(to.children[0], clamp(q * 1.4, 0, 1));
        }
        if (p >= 1) {
            from.scale.setScalar(1);
            to.scale.setScalar(1);
            Islands.setOpacity(from.children[0], 1);
            Islands.setOpacity(to.children[0], 1);
            state.flip = null;
        }
    }

    function frame(now, time) {
        if (!stage.visible) {
            return;
        }
        state.holders.forEach(function (holder, i) {
            if (!state.flip) {
                holder.visible = i === state.current;
            }
            if (holder.visible) {
                placeIdle(holder, time);
                holder.children[0].userData.tick(time);
            }
        });
        if (state.flip) {
            animateFlip(now);
        }
        stage.camera.position.set(0, 8.5, (
            isMobile()
            ? 25
            : 21
        ));
        stage.camera.lookAt(0, (
            isMobile()
            ? -1.6
            : -1.7
        ), 0);
        stage.renderer.render(stage.scene, stage.camera);
    }

    hero.querySelector(".world__arrow--prev").addEventListener(
        "click",
        function () {
            go(state.current - 1);
        }
    );
    hero.querySelector(".world__arrow--next").addEventListener(
        "click",
        function () {
            go(state.current + 1);
        }
    );
    ui.dots.forEach(function (dot, i) {
        dot.addEventListener("click", function () {
            go(i);
        });
    });
    document.querySelectorAll("[data-world]").forEach(function (link) {
        link.addEventListener("click", function () {
            go(Number(link.dataset.world));
        });
    });
    document.addEventListener("keydown", function (event) {
        const inHero = hero.getBoundingClientRect().bottom > 120;
        if (!inHero || event.target.closest("input, textarea")) {
            return;
        }
        if (event.key === "ArrowRight") {
            go(state.current + 1);
        }
        if (event.key === "ArrowLeft") {
            go(state.current - 1);
        }
    });
    (function swipe() {
        let startX = null;
        hero.addEventListener("touchstart", function (event) {
            startX = event.touches[0].clientX;
        }, {passive: true});
        hero.addEventListener("touchend", function (event) {
            const diff = (
                startX === null
                ? 0
                : event.changedTouches[0].clientX - startX
            );
            if (Math.abs(diff) > 50) {
                go(state.current + (
                    diff < 0
                    ? 1
                    : -1
                ));
            }
            startX = null;
        });
    }());

    paintUI(0);

    if (!window.THREE || !canvas) {
        return null;
    }
    stage = createStage(canvas, 30);
    WORLDS.forEach(function (world, i) {
        const holder = holderFor(
            Islands.build(world.name, world, 11 + i * 17),
            1
        );
        holder.visible = i === 0;
        state.holders.push(holder);
        stage.scene.add(holder);
    });
    window.addEventListener("pointermove", function (event) {
        if (event.pointerType === "mouse" && !REDUCED.matches) {
            state.pointerX = event.clientX / window.innerWidth - 0.5;
            state.pointerY = event.clientY / window.innerHeight - 0.5;
        }
    });
    return frame;
}

/* ==========================================================================
   СВЯЗЬ: кольцо островов поворачивается к выбранному способу связи
   ========================================================================== */
function initContactRing(onSelect) {
    const section = document.getElementById("contact");
    const canvas = document.getElementById("contact-canvas");
    const radius = 5.6;
    const step = Math.PI * 2 / CONTACTS.length;
    const state = {angle: 0, current: 0, last: 0, target: 0};
    const label = section.querySelector(".ring__label");
    let stage = null;
    let ring;
    let holders = [];

    function select(index) {
        const delta = wrapAngle(-index * step - state.target);
        state.target += delta;
        state.current = index;
        section.style.setProperty("--bg", CONTACTS[index].bg);
        section.style.setProperty("--bg2", CONTACTS[index].bg2);
        label.textContent = CONTACTS[index].title;
        label.classList.remove("is-in");
        label.getBoundingClientRect();
        label.classList.add("is-in");
        if (REDUCED.matches) {
            state.angle = state.target;
        }
    }

    function frame(now, time) {
        const dt = Math.min((now - (state.last || now)) / 1000, 0.1);
        const ease = (
            REDUCED.matches
            ? 1
            : 1 - Math.exp(-dt * 3.2)
        );
        const moving = Math.abs(state.target - state.angle);

        state.last = now;
        if (!stage.visible) {
            return;
        }
        state.angle += (state.target - state.angle) * ease;
        ring.rotation.y = state.angle;
        ring.position.y = -Math.min(moving, 1.2) * 0.5;

        holders.forEach(function (holder, i) {
            const island = holder.children[0];
            const active = i === state.current;
            const scale = holder.scale.x + ((
                active
                ? 0.66
                : 0.46
            ) - holder.scale.x) * ease;
            holder.scale.setScalar(scale);
            holder.rotation.y = Math.sin(time * 0.3 + i) * 0.1;
            const away = (1 - Math.cos(i * step + state.angle)) * 1.8;
            const bob = Math.sin(time * 0.9 + i * 1.7) * 0.15;
            holder.position.y = bob - away;
            island.userData.tick(time);
        });

        stage.camera.position.set(0, 4.2, radius + (
            isMobile()
            ? 13
            : 10.5
        ));
        stage.camera.lookAt(0, 0.1, radius - 1);
        stage.renderer.render(stage.scene, stage.camera);
    }

    if (!window.THREE || !canvas) {
        return {frame: null, select};
    }
    stage = createStage(canvas, 34);
    ring = new THREE.Group();
    stage.scene.add(ring);

    holders = CONTACTS.map(function (contact, i) {
        const a = i * step;
        const holder = holderFor(
            Islands.build(contact.name, contact, 101 + i * 31),
            0.48
        );
        holder.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
        holder.children[0].rotation.y = Math.PI / 4 + a;
        holder.userData.index = i;
        ring.add(holder);
        return holder;
    });

    (function clickable() {
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        canvas.addEventListener("click", function (event) {
            const rect = canvas.getBoundingClientRect();
            let hit;
            pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
            pointer.y = -(event.clientY - rect.top) / rect.height * 2 + 1;
            raycaster.setFromCamera(pointer, stage.camera);
            hit = raycaster.intersectObjects(holders, true)[0];
            let node = hit && hit.object;
            while (node && node.userData.index === undefined) {
                node = node.parent;
            }
            if (node) {
                onSelect(node.userData.index);
            }
        });
    }());

    return {frame, select};
}

/* ==========================================================================
   Форма связи: способ связи меняет остров и поле ввода
   ========================================================================== */
function initForm(ring) {
    const form = document.getElementById("contact-form");
    const chips = Array.from(form.querySelectorAll(".method__input"));
    const field = form.elements.contact;
    const fieldLabel = form.querySelector(".contact-field__label");
    const fields = Array.from(form.querySelectorAll(".form__field"));
    const agree = form.elements.agree;
    const submit = form.querySelector(".form__submit");
    const status = form.querySelector(".form__status");
    let method = 0;

    function saveDraft() {
        const data = {method};
        fields.forEach(function (input) {
            data[input.name] = input.value;
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (ignore) {
            return;
        }
    }

    function loadDraft() {
        let data;
        try {
            data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        } catch (ignore) {
            data = {};
        }
        return data;
    }

    function setStatus(text, type) {
        status.textContent = text;
        status.className = "form__status" + (
            type
            ? " is-" + type
            : ""
        );
    }

    function applyMethod(index, keepValue) {
        const contact = CONTACTS[index];
        method = index;
        chips[index].checked = true;
        field.type = contact.type;
        field.placeholder = contact.placeholder;
        field.autocomplete = contact.autocomplete;
        fieldLabel.textContent = contact.label;
        field.classList.remove("is-invalid");
        if (!keepValue) {
            field.value = "";
        }
        if (contact.type === "date") {
            field.min = new Date().toISOString().slice(0, 10);
        } else {
            field.removeAttribute("min");
        }
        form.elements.method.value = contact.name;
        ring.select(index);
    }

    function validate() {
        const contact = CONTACTS[method];
        let firstInvalid = null;
        let message = "Заполни отмеченные поля и отметь согласие.";

        fields.forEach(function (input) {
            input.classList.remove("is-invalid");
            if (input.required && input.value.trim() === "") {
                input.classList.add("is-invalid");
                firstInvalid = firstInvalid || input;
            }
        });
        const value = field.value.trim();
        if (value !== "" && !contact.check.test(value)) {
            field.classList.add("is-invalid");
            firstInvalid = firstInvalid || field;
            message = contact.error;
        }
        agree.classList.toggle("is-invalid", !agree.checked);
        if (!agree.checked) {
            firstInvalid = firstInvalid || agree;
        }
        if (firstInvalid) {
            firstInvalid.focus();
            setStatus(message, "error");
            return false;
        }
        return true;
    }

    function setLoading(isLoading) {
        submit.disabled = isLoading;
        submit.classList.toggle("is-loading", isLoading);
        submit.setAttribute("aria-busy", String(isLoading));
    }

    chips.forEach(function (chip, i) {
        chip.addEventListener("change", function () {
            if (chip.checked) {
                applyMethod(i, false);
                saveDraft();
            }
        });
    });

    (function restore() {
        const data = loadDraft();
        const saved = clamp(Number(data.method) || 0, 0, CONTACTS.length - 1);
        applyMethod(saved, true);
        fields.forEach(function (input) {
            if (typeof data[input.name] === "string") {
                input.value = data[input.name];
            }
        });
    }());

    form.addEventListener("input", function (event) {
        event.target.classList.remove("is-invalid");
        saveDraft();
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validate()) {
            return;
        }
        setLoading(true);
        setStatus("Отправляем на остров…", "");

        fetch(FORM_ENDPOINT, {
            body: new FormData(form),
            headers: {Accept: "application/json"},
            method: "POST"
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            return response.json();
        }).then(function () {
            fields.forEach(function (input) {
                input.value = "";
            });
            agree.checked = false;
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (ignore) {
                setStatus("", "");
            }
            setStatus(
                "Готово! Свяжемся через «" + CONTACTS[method].title
                + "» в течение дня.",
                "success"
            );
        }).catch(function () {
            setStatus(
                "Не получилось отправить. Проверь интернет "
                + "и попробуй ещё раз.",
                "error"
            );
        }).finally(function () {
            setLoading(false);
        });
    });

    return applyMethod;
}

/* ==========================================================================
   Меню, видео, аккордеон
   ========================================================================== */
function initMenu() {
    const burger = document.querySelector(".burger");
    const nav = document.querySelector(".nav");

    function setOpen(isOpen) {
        nav.classList.toggle("is-open", isOpen);
        burger.setAttribute("aria-expanded", String(isOpen));
        burger.setAttribute(
            "aria-label",
            (
                isOpen
                ? "Закрыть меню"
                : "Открыть меню"
            )
        );
        document.body.classList.toggle("menu-open", isOpen);
    }

    burger.addEventListener("click", function () {
        setOpen(!nav.classList.contains("is-open"));
    });
    nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            if (isMobile()) {
                setOpen(false);
            }
        });
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && nav.classList.contains("is-open")) {
            setOpen(false);
            burger.focus();
        }
    });
    window.matchMedia(MOBILE_QUERY).addEventListener("change", function () {
        setOpen(false);
    });
}

function initVideo() {
    const video = document.querySelector(".hero__video");
    let playing;

    if (!video) {
        return;
    }
    if (REDUCED.matches) {
        video.pause();
        return;
    }
    playing = video.play();
    if (playing !== undefined) {
        playing.catch(function () {
            video.setAttribute("controls", "");
        });
    }
}

function initAccordion() {
    const items = document.querySelectorAll(".acc__item");

    function close(item) {
        const panel = item.querySelector(".acc__a");
        panel.style.height = panel.scrollHeight + "px";
        panel.getBoundingClientRect();
        panel.style.height = "0px";
        item.classList.remove("is-open");
        item.querySelector(".acc__btn").setAttribute("aria-expanded", "false");
    }

    function open(item) {
        const panel = item.querySelector(".acc__a");
        item.classList.add("is-open");
        item.querySelector(".acc__btn").setAttribute("aria-expanded", "true");
        panel.style.height = "0px";
        panel.getBoundingClientRect();
        panel.style.height = panel.scrollHeight + "px";
    }

    items.forEach(function (item) {
        const panel = item.querySelector(".acc__a");
        panel.addEventListener("transitionend", function () {
            if (item.classList.contains("is-open")) {
                panel.style.height = "auto";
            }
        });
        item.querySelector(".acc__btn").addEventListener("click", function () {
            const wasOpen = item.classList.contains("is-open");
            items.forEach(function (other) {
                if (other.classList.contains("is-open")) {
                    close(other);
                }
            });
            if (!wasOpen) {
                open(item);
            }
        });
    });
}

/* ==========================================================================
   Запуск: один цикл requestAnimationFrame на обе сцены
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function () {
    let heroFrame = null;
    let ring = {frame: null, select: function () {
        return;
    }};
    let applyMethod = null;
    const start = performance.now();

    try {
        heroFrame = initHeroWorlds();
        ring = initContactRing(function (index) {
            if (applyMethod) {
                applyMethod(index, false);
            }
        });
    } catch (error) {
        document.documentElement.classList.add("no-3d");
        window.console.warn("3D отключено:", error);
    }
    applyMethod = initForm(ring);
    initMenu();
    initVideo();
    initAccordion();

    document.querySelectorAll("[data-method]").forEach(function (link) {
        link.addEventListener("click", function () {
            applyMethod(Number(link.dataset.method), false);
        });
    });

    if (!heroFrame && !ring.frame) {
        document.documentElement.classList.add("no-3d");
        return;
    }
    (function loop(now) {
        const time = (
            REDUCED.matches
            ? 0
            : (now - start) / 1000
        );
        if (heroFrame) {
            heroFrame(now, time);
        }
        if (ring.frame) {
            ring.frame(now, time);
        }
        window.requestAnimationFrame(loop);
    }(start));
});
