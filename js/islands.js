/*jslint browser */
/*global THREE */

/* ==========================================================================
   Острова: low-poly детали и сборка восьми островов.
   Каждый остров — THREE.Group с полем userData.tick(time) для анимации
   и userData.materials для плавного исчезновения при перевороте.
   ========================================================================== */

// Цвета в коде указаны в sRGB, как в CSS
THREE.ColorManagement.legacyMode = false;

const TOP = 0.42;
const CABINS = [0xff6fa8, 0x3b3df5, 0xffd34a, 0x5fd0c0];
const BALLS = [0xffd34a, 0x5fd0c0, 0xff6fa8];

function islandRandom(seed) {
    let state = seed;
    return function () {
        state = (state * 16807) % 2147483647;
        return (state - 1) / 2147483646;
    };
}

function roundedShape(width, depth, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -depth / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + depth - radius);
    shape.quadraticCurveTo(
        x + width,
        y + depth,
        x + width - radius,
        y + depth
    );
    shape.lineTo(x + radius, y + depth);
    shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
}

/* ---------- Набор инструментов для одного острова ---------- */
function makeKit(seed) {
    const group = new THREE.Group();
    const materials = [];
    const animators = [];
    const cache = {};
    const random = islandRandom(seed);

    function mat(color, options) {
        const extra = options || {};
        const key = [color, extra.emissive || 0, Boolean(extra.basic)].join();
        let material = cache[key];
        if (!material) {
            material = (
                extra.basic
                ? new THREE.MeshBasicMaterial({color})
                : new THREE.MeshStandardMaterial({
                    color,
                    emissive: extra.emissive || 0x000000,
                    emissiveIntensity: (
                        extra.emissive
                        ? 1.2
                        : 0
                    ),
                    flatShading: true,
                    metalness: 0,
                    roughness: 0.82
                })
            );
            cache[key] = material;
            materials.push(material);
        }
        return material;
    }

    function add(geometry, color, x, y, z, options) {
        const extra = options || {};
        const mesh = new THREE.Mesh(geometry, mat(color, extra));
        mesh.position.set(x, y, z);
        mesh.rotation.y = extra.rot || 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const target = extra.parent || group;
        target.add(mesh);
        return mesh;
    }

    function box(x, z, w, h, d, color, options) {
        const extra = options || {};
        const y = (
            extra.y === undefined
            ? TOP
            : extra.y
        );
        const geometry = new THREE.BoxGeometry(w, h, d);
        return add(geometry, color, x, y + h / 2, z, extra);
    }

    function cyl(x, z, rTop, rBottom, h, color, options) {
        const extra = options || {};
        const y = (
            extra.y === undefined
            ? TOP
            : extra.y
        );
        return add(
            new THREE.CylinderGeometry(rTop, rBottom, h, extra.seg || 10),
            color,
            x,
            y + h / 2,
            z,
            extra
        );
    }

    function slab(width, depth, radius, height, color, y) {
        const geometry = new THREE.ExtrudeGeometry(
            roundedShape(width, depth, radius),
            {
                bevelEnabled: true,
                bevelSegments: 2,
                bevelSize: 0.1,
                bevelThickness: 0.1,
                curveSegments: 10,
                depth: height
            }
        );
        geometry.rotateX(-Math.PI / 2);
        return add(geometry, color, 0, y, 0);
    }

    return {
        add,
        animators,
        box,
        cyl,
        group,
        mat,
        materials,
        random,
        slab
    };
}

/* ---------- Основа острова ---------- */
function base(kit, theme) {
    kit.slab(5.2, 5.2, 1.4, 0.9, theme.rock, -2.25);
    kit.slab(6, 6, 1.3, 1.25, theme.soil, -1.3);
    kit.slab(6.05, 6.05, 1.3, 0.22, theme.ground, 0);
    (function shadow() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(11, 11),
            new THREE.MeshBasicMaterial({
                depthWrite: false,
                map: new THREE.CanvasTexture(canvas),
                opacity: 0.35,
                transparent: true
            })
        );
        canvas.width = 128;
        canvas.height = 128;
        g.addColorStop(0, "rgba(0,0,0,.6)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        plane.material.map.needsUpdate = true;
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -2.9;
        kit.materials.push(plane.material);
        kit.group.add(plane);
    }());
}

/* ---------- Детали ---------- */
function house(kit, x, z, size, wall, roof, rot) {
    const s = size || 1;
    const house3 = new THREE.Group();
    house3.position.set(x, 0, z);
    house3.rotation.y = rot || 0;
    kit.group.add(house3);
    kit.box(0, 0, 0.8 * s, 0.6 * s, 0.7 * s, wall, {parent: house3});
    kit.add(
        new THREE.ConeGeometry(0.62 * s, 0.45 * s, 4),
        roof,
        0,
        TOP + 0.6 * s + 0.22 * s,
        0,
        {parent: house3, rot: Math.PI / 4}
    );
    kit.box(0, 0.36 * s, 0.2 * s, 0.3 * s, 0.02, 0x3a2a22, {parent: house3});
}

function tree(kit, x, z, size, color) {
    const s = size || 1;
    kit.cyl(x, z, 0.06 * s, 0.08 * s, 0.35 * s, 0x7a4b2a);
    kit.add(
        new THREE.IcosahedronGeometry(0.34 * s, 0),
        color || 0x4fae4c,
        x,
        TOP + 0.55 * s,
        z
    );
}

function pine(kit, x, z, size, color) {
    const s = size || 1;
    kit.cyl(x, z, 0.05 * s, 0.07 * s, 0.25 * s, 0x6b4426);
    const low = new THREE.ConeGeometry(0.34 * s, 0.6 * s, 7);
    const high = new THREE.ConeGeometry(0.24 * s, 0.45 * s, 7);
    kit.add(low, color, x, TOP + 0.5 * s, z);
    kit.add(high, color, x, TOP + 0.8 * s, z);
}

function rock(kit, x, z, size, color) {
    const mesh = kit.add(
        new THREE.DodecahedronGeometry(0.3 * size, 0),
        color,
        x,
        TOP + 0.12 * size,
        z
    );
    mesh.scale.y = 0.6;
    mesh.rotation.y = kit.random() * 3;
}

function cactus(kit, x, z, size) {
    const s = size || 1;
    kit.cyl(x, z, 0.09 * s, 0.1 * s, 0.7 * s, 0x5c8a3a);
    const green = 0x5c8a3a;
    kit.cyl(x + 0.16 * s, z, 0.06 * s, 0.06 * s, 0.25 * s, green, {
        y: TOP + 0.3 * s
    });
    kit.cyl(x - 0.15 * s, z, 0.05 * s, 0.05 * s, 0.2 * s, green, {
        y: TOP + 0.42 * s
    });
}

function path(kit, x, z, w, d, color, rot) {
    kit.box(x, z, w, 0.03, d, color, {rot: rot || 0, y: TOP - 0.02});
}

function pond(kit, x, z, r, color) {
    kit.cyl(x, z, r, r, 0.04, color, {seg: 18, y: TOP - 0.02});
}

function skyscraper(kit, x, z, w, h, color, glow) {
    kit.box(x, z, w, h, w, color);
    [0.25, 0.5, 0.75].forEach(function (k) {
        if (h * k > 0.4) {
            kit.box(x, z, w + 0.04, 0.05, w + 0.04, glow, {
                emissive: glow,
                y: TOP + h * k
            });
        }
    });
    kit.box(x, z, w * 0.5, 0.25, w * 0.5, color, {y: TOP + h});
}

function lighthouse(kit, x, z) {
    [0xffffff, 0xe54b3c, 0xffffff, 0xe54b3c].forEach(function (color, i) {
        kit.cyl(x, z, 0.3 - i * 0.03, 0.33 - i * 0.03, 0.4, color, {
            seg: 12,
            y: TOP + i * 0.4
        });
    });
    kit.cyl(x, z, 0.22, 0.22, 0.32, 0xfff3b0, {
        emissive: 0xffd76a,
        seg: 12,
        y: TOP + 1.6
    });
    kit.add(new THREE.ConeGeometry(0.3, 0.32, 12), 0xe54b3c, x, TOP + 2.08, z);
}

function radioTower(kit, x, z) {
    const lamp = kit.add(
        new THREE.SphereGeometry(0.1, 10, 8),
        0xff5b5b,
        x,
        TOP + 3.05,
        z,
        {emissive: 0xff2a2a}
    );
    kit.cyl(x, z, 0.05, 0.32, 3, 0xd8dbe8, {seg: 4});
    [0.7, 1.4, 2.1].forEach(function (h) {
        kit.add(
            new THREE.TorusGeometry(0.32 - h * 0.09, 0.03, 6, 16),
            0xd8dbe8,
            x,
            TOP + h,
            z
        ).rotation.x = Math.PI / 2;
    });
    kit.animators.push(function (t) {
        lamp.material.emissiveIntensity = (
            Math.sin(t * 4) > 0
            ? 2
            : 0.1
        );
    });
}

function mailbox(kit, x, z) {
    kit.cyl(x, z, 0.05, 0.05, 0.5, 0x6b4426);
    kit.box(x, z, 0.4, 0.3, 0.55, 0x3b3df5, {y: TOP + 0.5});
    kit.add(
        new THREE.CylinderGeometry(0.2, 0.2, 0.55, 12, 1, false, 0, Math.PI),
        0x3b3df5,
        x,
        TOP + 0.8,
        z
    ).rotation.set(Math.PI / 2, 0, Math.PI / 2);
    kit.box(x + 0.22, z + 0.1, 0.03, 0.3, 0.1, 0xff4a3d, {y: TOP + 0.7});
}

function umbrellaTable(kit, x, z, color) {
    kit.cyl(x, z, 0.25, 0.25, 0.04, 0xffffff, {seg: 14, y: TOP + 0.3});
    kit.cyl(x, z, 0.03, 0.03, 0.9, 0xdddddd);
    kit.add(new THREE.ConeGeometry(0.55, 0.25, 8), color, x, TOP + 0.95, z);
    [[0.35, 0], [-0.35, 0], [0, 0.35]].forEach(function (p) {
        kit.box(x + p[0], z + p[1], 0.16, 0.2, 0.16, 0xffffff);
    });
}

function ferrisWheel(kit, x, z) {
    const wheel = new THREE.Group();
    wheel.position.set(x, TOP + 1.5, z);
    kit.group.add(wheel);
    kit.add(new THREE.TorusGeometry(1.1, 0.05, 6, 28), 0xffffff, 0, 0, 0, {
        parent: wheel
    });
    Array.from({length: 8}).forEach(function (ignore, i) {
        const a = i / 8 * Math.PI * 2;
        const spoke = kit.add(
            new THREE.BoxGeometry(0.04, 1.1, 0.04),
            0xffffff,
            Math.cos(a) * 0.55,
            Math.sin(a) * 0.55,
            0,
            {parent: wheel}
        );
        spoke.rotation.z = a - Math.PI / 2;
        kit.box(
            Math.cos(a) * 1.1,
            0,
            0.22,
            0.2,
            0.22,
            CABINS[i % CABINS.length],
            {parent: wheel, y: Math.sin(a) * 1.1 - 0.1}
        );
    });
    [-0.5, 0.5].forEach(function (dx) {
        kit.box(x + dx * 0.6, z, 0.08, 1.5, 0.08, 0xffffff, {rot: dx});
    });
    kit.animators.push(function (t) {
        wheel.rotation.z = t * 0.4;
    });
}

function plane(kit) {
    const geometry = new THREE.BufferGeometry();
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, kit.mat(0xffffff));
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([
        0, 0, 0.45, -0.32, 0, -0.25, 0, 0.04, -0.12,
        0, 0, 0.45, 0, 0.04, -0.12, 0.32, 0, -0.25,
        0, 0, 0.45, 0, -0.14, -0.2, 0, 0.04, -0.12
    ], 3));
    geometry.computeVertexNormals();
    mesh.material.side = THREE.DoubleSide;
    mesh.position.set(2.6, 0, 0);
    holder.add(mesh);
    holder.position.y = 2.4;
    kit.group.add(holder);
    kit.animators.push(function (t) {
        holder.rotation.y = t * 0.8;
        mesh.position.y = Math.sin(t * 2) * 0.2;
        mesh.rotation.z = -0.35;
    });
}

function windowsBlock(kit, x, z, w, h, color, glow) {
    kit.box(x, z, w, h, w, color);
    Array.from({length: Math.floor(h / 0.28)}).forEach(function (ignore, i) {
        kit.box(x, z + w / 2 + 0.005, w * 0.7, 0.08, 0.01, glow, {
            emissive: glow,
            y: TOP + 0.18 + i * 0.28
        });
    });
}

/* ---------- Сами острова ---------- */
const BUILDERS = {
    brand(kit) {
        const colors = [0xd9a36a, 0xb7744a, 0xe8c48e, 0x8d5a3b, 0xc98c5a];
        path(kit, 0, 0.8, 4.6, 0.6, 0xc58552, 0.5);
        Array.from({length: 7}).forEach(function (ignore, i) {
            const size = 1.5 - i * 0.14;
            kit.box(
                (i % 2) * 0.12,
                -0.3 + (i % 3) * 0.06,
                size,
                0.42,
                size * 0.9,
                colors[i % colors.length],
                {rot: i * 0.12, y: TOP + i * 0.42}
            );
        });
        kit.box(0.35, -0.6, 0.6, 0.12, 0.5, 0x5c8a3a, {y: TOP + 1.7});
        const gem = new THREE.OctahedronGeometry(0.28, 0);
        kit.add(gem, 0xffd34a, 0, TOP + 3.3, -0.3, {emissive: 0xffa31a});
        [[-2, 1.6], [1.9, -1.8], [2.2, 1.2], [-1.6, -2]].forEach(function (p) {
            cactus(kit, p[0], p[1], 0.9 + kit.random() * 0.4);
        });
        [
            [-2.2, -0.6],
            [1.4, 2.1],
            [2.3, -0.3],
            [-0.8, 2.2]
        ].forEach(function (p) {
            rock(kit, p[0], p[1], 1 + kit.random(), 0xa66a44);
        });
        house(kit, 1.6, 0.6, 0.8, 0xe8c48e, 0x8d5a3b, 0.4);
        house(kit, -1.4, 0.9, 0.7, 0xd9a36a, 0x6e4430, -0.3);
    },
    email(kit) {
        kit.box(-0.6, -0.8, 1.8, 1.1, 1.4, 0xfff4e8);
        const roof = new THREE.ConeGeometry(1.35, 0.7, 4);
        kit.add(roof, 0xff4a3d, -0.6, TOP + 1.45, -0.8, {rot: Math.PI / 4});
        kit.box(-0.6, -0.08, 0.5, 0.6, 0.02, 0x3b3df5);
        kit.box(-0.6, -0.07, 1.2, 0.2, 0.02, 0x3b3df5, {y: TOP + 0.75});
        mailbox(kit, 1.3, 0.4);
        mailbox(kit, 0.6, 1.5);
        [0, 1, 2].forEach(function (i) {
            kit.box(1.6, -1.4, 0.55, 0.08, 0.38, 0xffffff, {
                rot: i * 0.25,
                y: TOP + i * 0.08
            });
        });
        path(kit, 0.3, 0.6, 0.45, 4.6, 0xe9d5ff, -0.3);
        [
            [-2.1, 1.4],
            [-1.9, 2.3],
            [2.3, 2.2],
            [2.3, -0.6]
        ].forEach(function (p) {
            tree(kit, p[0], p[1], 0.85, 0xc39bf5);
        });
    },
    meeting(kit) {
        pond(kit, 1.4, -1.4, 0.9, 0x6fd2f0);
        path(kit, -0.3, 0.3, 4.8, 0.5, 0xf2e6c9, 0.25);
        umbrellaTable(kit, -1.3, -0.8, 0xff4a3d);
        umbrellaTable(kit, 0.3, 1.2, 0xffd34a);
        umbrellaTable(kit, -1.6, 1.3, 0x3b3df5);
        house(kit, 1.5, 1, 1.2, 0xfff6e5, 0x2e8b57, -0.3);
        [
            [-2.3, -2.2],
            [-0.4, -2.3],
            [2.3, 2.3],
            [-2.4, 0.3],
            [0.6, -0.4]
        ].forEach(function (p, i) {
            tree(kit, p[0], p[1], 0.9 + (i % 2) * 0.3, 0x3fae5f);
        });
    },
    motion(kit) {
        ferrisWheel(kit, -0.6, -0.8);
        path(kit, 0.5, 1, 4.8, 0.5, 0xffd6e6, -0.4);
        [
            [1.6, 0.5, 0xff6fa8],
            [1.9, -1.6, 0x3b3df5],
            [-2, 1.4, 0xffd34a]
        ].forEach(function (p) {
            const top = new THREE.ConeGeometry(0.6, 0.6, 12);
            kit.cyl(p[0], p[1], 0.45, 0.5, 0.5, 0xffffff, {seg: 12});
            kit.add(top, p[2], p[0], TOP + 0.8, p[1]);
        });
        [
            [-1.8, -2.2],
            [2.3, 2.1],
            [0.4, 2.3],
            [-2.4, 0.2]
        ].forEach(function (p) {
            tree(kit, p[0], p[1], 0.9, 0xff8fc0);
        });
        [[0.8, 1.9], [-0.6, 1.6], [1.2, -0.5]].forEach(function (p, i) {
            const ball = kit.add(
                new THREE.SphereGeometry(0.16, 10, 8),
                BALLS[i],
                p[0],
                TOP + 1.4,
                p[1]
            );
            kit.cyl(p[0], p[1], 0.008, 0.008, 1.25, 0xffffff, {seg: 4});
            kit.animators.push(function (t) {
                ball.position.y = TOP + 1.4 + Math.sin(t * 2 + i) * 0.08;
            });
        });
    },
    phone(kit) {
        radioTower(kit, -0.8, -0.9);
        [
            [1.1, -1.4, 0.8, 1.6],
            [1.6, 0.3, 0.7, 1.1],
            [-1.9, 0.9, 0.7, 1.3],
            [0.2, 1.4, 0.8, 0.9]
        ].forEach(function (b) {
            windowsBlock(kit, b[0], b[1], b[2], b[3], 0x6b4ee6, 0xffd34a);
        });
        path(kit, 0, 0, 5.4, 0.3, 0x3a1f9c, 0.8);
        [[-2.2, -1.9], [2.3, 2.2], [-0.6, 2.3]].forEach(function (p) {
            pine(kit, p[0], p[1], 1, 0x8b6cff);
        });
        const arc = new THREE.TorusGeometry(0.5, 0.04, 6, 24, Math.PI);
        kit.add(arc, 0xffd34a, -0.8, TOP + 3.1, -0.9, {emissive: 0xffb81a});
    },
    telegram(kit) {
        lighthouse(kit, -1.4, -1.2);
        plane(kit);
        path(kit, 0.6, 0.6, 0.45, 4.8, 0xf1e6c8, 0.7);
        house(kit, 1.4, -1.2, 1, 0xffffff, 0x2aa3e8, 0.3);
        house(kit, 1.8, 0.6, 0.8, 0xffffff, 0x2aa3e8, -0.2);
        house(kit, -0.3, 1.6, 0.9, 0xf4f8ff, 0x1e7fd0, 0.6);
        [[-2.1, 1], [-1.8, 2.2], [2.3, 2.1], [0.4, -2.2]].forEach(function (p) {
            tree(kit, p[0], p[1], 0.9, 0x5cc9a7);
        });
        pond(kit, -0.4, -0.2, 0.55, 0x8fdcff);
    },
    ui(kit) {
        path(kit, -0.2, 0.2, 0.5, 5.6, 0xd9c79b, 0.3);
        lighthouse(kit, 2.1, -2);
        pond(kit, -1.6, 1.7, 0.7, 0x4fc3e8);
        [
            [-1.5, -1.6, 0xfafafa, 0xe54b3c],
            [-0.3, -1.2, 0xf4e3c3, 0x3b3df5],
            [0.9, 0.2, 0xffffff, 0xe54b3c],
            [-1.7, 0, 0xf4e3c3, 0xff8a3d],
            [0.6, 1.6, 0xfafafa, 0x3b3df5]
        ].forEach(function (h, i) {
            house(kit, h[0], h[1], 0.9 + (i % 2) * 0.25, h[2], h[3], i * 0.4);
        });
        [
            [2, 0.8],
            [2.3, 2],
            [-2.3, -2.2],
            [1.1, -2.2],
            [-0.6, 2.3],
            [2.4, -0.6]
        ].forEach(function (p, i) {
            tree(kit, p[0], p[1], 0.9 + (i % 3) * 0.2, (
                i % 2
                ? 0x4fae4c
                : 0x3d9a48
            ));
        });
    },
    web(kit) {
        const glow = 0x5ff6ff;
        pond(kit, 1.5, 1.6, 0.8, 0x2bd4ff);
        [
            [-1.6, -1.6, 0.8, 2.6],
            [-0.4, -1.8, 0.7, 3.4],
            [0.9, -1.5, 0.9, 2.2],
            [-1.8, -0.2, 0.7, 1.6],
            [-0.5, -0.3, 0.8, 2.9],
            [1.9, -0.1, 0.6, 1.4],
            [-1.6, 1.4, 0.6, 1.1],
            [0.2, 1.2, 0.7, 1.8]
        ].forEach(function (b, i) {
            skyscraper(kit, b[0], b[1], b[2], b[3], (
                i % 2
                ? 0x4e5bd8
                : 0x6f7ae6
            ), glow);
        });
        path(kit, 0, 0.45, 5.4, 0.25, 0x2a2f9a);
        path(kit, 0.4, 0, 0.25, 5.4, 0x2a2f9a);
        kit.box(1.5, 1.6, 0.06, 0.9, 0.06, 0xffffff, {y: TOP});
        const lamp = new THREE.SphereGeometry(0.16, 10, 8);
        kit.add(lamp, 0xff6fd8, 1.5, TOP + 1, 1.6, {emissive: 0xff3fc8});
    }
};

function buildIsland(name, theme, seed) {
    const kit = makeKit(seed || 7);
    base(kit, theme);
    BUILDERS[name](kit);
    kit.group.userData = {
        materials: kit.materials,
        tick(t) {
            kit.animators.forEach(function (fn) {
                fn(t);
            });
        }
    };
    return kit.group;
}

function setIslandOpacity(island, value) {
    island.userData.materials.forEach(function (material) {
        if (material.userData.baseOpacity === undefined) {
            material.userData.baseOpacity = material.opacity;
        }
        const solid = material.userData.baseOpacity === 1;
        material.transparent = value < 0.999 || !solid;
        material.opacity = material.userData.baseOpacity * value;
        material.depthWrite = value > 0.999 && solid;
    });
}

window.Islands = {
    build: buildIsland,
    setOpacity: setIslandOpacity
};
