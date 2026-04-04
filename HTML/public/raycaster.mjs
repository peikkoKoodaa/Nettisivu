const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MapH = 10;
const MapW = 20;

const map = [
    '####################',
    '# =    #      #    #',
    '# # ######=######=##',
    '# #      # #       #',
    '# # ## ###   #####=#',
    '#    #     ###     #',
    '# #  # #=#     ### #',
    '# #### # ####### # #',
    '#      #         = #',
    '####################'
];

const grid = map.map(row => row.split(''));

let playerX = 1.5;
let playerY = 1.5;
let playerAngle = 0;

let playerHealth = 100;
const playerMaxHealth = 100;
let playerDead = false;

const FOV = degToRad(90);

const moveSpeed = 0.04;
const rotSpeed = 0.02;

const keys = {};

const enemies = [];

const gunImage = new Image();
gunImage.src = "gun.png";
const aimImage = new Image();
aimImage.src = "aim.png";
const enemyImage = new Image();
enemyImage.src = "enemy.png";
const enemy2Image = new Image();
enemy2Image.src = "enemy_2.png";
const enemy3Image = new Image();
enemy3Image.src = "enemy_3.png";

let gunSprite = null;
let aimSprite = null;
let enemySprite = null;
let enemy2Sprite = null;
let enemy3Sprite = null;

let weaponBobTime = 0;
let weaponBobAmount = 0;

let mouseDown = false;
let shootPressedLastFrame = false;
let aiming = false;

let recoil = 0;
let recoilKick = 0;

let zBuffer = [];

let enemiesCount = 2;
let wave = 0;
let waveTextTimer = 0;

gunImage.onload = () => {
    gunSprite = makeWhiteTransparent(gunImage);
};

aimImage.onload = () => {
    aimSprite = makeWhiteTransparent(aimImage);
};

enemyImage.onload = () => {
    enemySprite = makeWhiteTransparent(enemyImage);
};

enemy2Image.onload = () => {
    enemy2Sprite = makeWhiteTransparent(enemy2Image);
};

enemy3Image.onload = () => {
    enemy3Sprite = makeWhiteTransparent(enemy3Image);
};

window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("click", async () => {
    if (document.pointerLockElement !== canvas) {
        await canvas.requestPointerLock();
    }
});

const mouseSensitivity = 0.0025;

window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) {
        playerAngle += e.movementX * mouseSensitivity;
    }
});

window.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        mouseDown = true;
    }
    if (e.button === 2) {
        aiming = true;
    }    
});

window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        mouseDown = false;
    }
    if (e.button === 2) {
        aiming = false;
    }    
});

function getAliveEnemyCount() {
    return enemies.filter(enemy => enemy.alive).length;
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function isEmptyCell(x, y) {
    if (x < 0 || y < 0 || x >= MapW || y >= MapH) return false;
    return grid[y][x] === ' ';
}

function isFarEnoughFromPlayer(cellX, cellY, minDistance) {
    const dx = (cellX + 0.5) - playerX;
    const dy = (cellY + 0.5) - playerY;
    return Math.sqrt(dx * dx + dy * dy) >= minDistance;
}

function isFarEnoughFromEnemies(cellX, cellY, minDistance) {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        const dx = (cellX + 0.5) - enemy.x;
        const dy = (cellY + 0.5) - enemy.y;

        if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
            return false;
        }
    }
    return true;
}

function spawnEnemies(count) {
    let spawned = 0;
    let attempts = 0;
    const maxAttempts = 1000;

    while (spawned < count && attempts < maxAttempts) {
        attempts++;

        const cellX = Math.floor(Math.random() * MapW);
        const cellY = Math.floor(Math.random() * MapH);

        if (!isEmptyCell(cellX, cellY)) continue;
        if (!isFarEnoughFromPlayer(cellX, cellY, 3.0)) continue;
        if (!isFarEnoughFromEnemies(cellX, cellY, 1.5)) continue;

        enemies.push({
            x: cellX + 0.5,
            y: cellY + 0.5,
            alive: true,
            health: 3,
            attackCooldown: 0
        });

        spawned++;
    }

    console.log(`Spawned ${spawned}/${count} enemies`);
}

function makeWhiteTransparent(image) {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = image.width;
    tempCanvas.height = image.height;

    tempCtx.drawImage(image, 0, 0);

    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0;
        }
    }

    tempCtx.putImageData(imgData, 0, 0);
    return tempCanvas;
}

function isWall(x, y) {
    if (x < 0 || y < 0 || x >= MapW || y >= MapH) return true;
    return grid[y][x] === '#';
}

function isDoor(x, y) {
    if (x < 0 || y < 0 || x >= MapW || y >= MapH) return false;
    return grid[y][x] === '=';
}

function isBlocked(x, y) {
    if (x < 0 || y < 0 || x >= MapW || y >= MapH) return true;
    return grid[y][x] === '#' || grid[y][x] === '=';
}

function openDoorInFront() {
    const reach = 1.0;
    const targetX = Math.floor(playerX + Math.cos(playerAngle) * reach);
    const targetY = Math.floor(playerY + Math.sin(playerAngle) * reach);

    if (isDoor(targetX, targetY)) {
        grid[targetY][targetX] = ' ';
    }
}

let spacePressedLastFrame = false;

function shoot() {
    recoilKick = 150;

    let bestEnemy = null;
    let bestDist = Infinity;

    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        const dx = enemy.x - playerX;
        const dy = enemy.y - playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let angleToEnemy = Math.atan2(dy, dx) - playerAngle;
        while (angleToEnemy < -Math.PI) angleToEnemy += Math.PI * 2;
        while (angleToEnemy > Math.PI) angleToEnemy -= Math.PI * 2;

        if (Math.abs(angleToEnemy) < 0.08) {
            const ray = castRay(playerX, playerY, Math.atan2(dy, dx));

            if (ray.distance >= dist - 0.1) {
                if (dist < bestDist) {
                    bestDist = dist;
                    bestEnemy = enemy;
                }
            }
        }
    }

    if (bestEnemy) {
        bestEnemy.health -= 1;
        if (bestEnemy.health <= 0) {
            bestEnemy.alive = false;
        }
    }
}

function update() {
    if (playerDead) return;

    let nextX = playerX;
    let nextY = playerY;
    let isMoving = false;

    if (keys["arrowleft"]) {
        playerAngle -= rotSpeed;
    }
    if (keys["arrowright"]) {
        playerAngle += rotSpeed;
    }

    if (keys["w"]) {
        nextX += Math.cos(playerAngle) * moveSpeed;
        nextY += Math.sin(playerAngle) * moveSpeed;
        isMoving = true;
    }
    if (keys["s"]) {
        nextX -= Math.cos(playerAngle) * moveSpeed;
        nextY -= Math.sin(playerAngle) * moveSpeed;
        isMoving = true;
    }
    if (keys["a"]) {
        nextX -= Math.cos(playerAngle + Math.PI / 2) * (moveSpeed / 2);
        nextY -= Math.sin(playerAngle + Math.PI / 2) * (moveSpeed / 2);
        isMoving = true;
    }
    if (keys["d"]) {
        nextX += Math.cos(playerAngle + Math.PI / 2) * moveSpeed;
        nextY += Math.sin(playerAngle + Math.PI / 2) * moveSpeed;
        isMoving = true;
    }

    if (!isBlocked(Math.floor(nextX), Math.floor(playerY))) {
        playerX = nextX;
    }
    if (!isBlocked(Math.floor(playerX), Math.floor(nextY))) {
        playerY = nextY;
    }

    if (keys[" "] && !spacePressedLastFrame) {
        openDoorInFront();
    }

    spacePressedLastFrame = !!keys[" "];

    if (isMoving) {
        weaponBobTime += 0.18;
        weaponBobAmount = Math.min(weaponBobAmount + 0.08, 1);
    } else {
        weaponBobAmount = Math.max(weaponBobAmount - 0.08, 0);
    }

    if (mouseDown && !shootPressedLastFrame) {
        shoot();
    }

    shootPressedLastFrame = mouseDown;

    recoil += (recoilKick - recoil) * 0.35;
    recoilKick *= 0.55;

    if (recoilKick < 0.01) recoilKick = 0;

    if (waveTextTimer > 0) {
        waveTextTimer--;
    }

    if (waveCooldown > 0) {
        waveCooldown--;
    }
}

function castRay(startX, startY, angle) {
    const stepSize = 0.02;
    let distance = 0;

    while (distance < 20) {
        const rayX = startX + Math.cos(angle) * distance;
        const rayY = startY + Math.sin(angle) * distance;

        const cellX = Math.floor(rayX);
        const cellY = Math.floor(rayY);

        if (isWall(cellX, cellY)) {
            return { distance, hit: "#", x: rayX, y: rayY };
        }

        if (isDoor(cellX, cellY)) {
            return { distance, hit: "=", x: rayX, y: rayY };
        }

        distance += stepSize;
    }

    return { distance: 20, hit: null, x: startX, y: startY };
}

function render() {
    const screenW = canvas.width;
    const screenH = canvas.height;

    zBuffer = new Array(screenW);

    ctx.fillStyle = "#2fafe1";
    ctx.fillRect(0, 0, screenW, screenH / 2);

    ctx.fillStyle = "#7ded05";
    ctx.fillRect(0, screenH / 2, screenW, screenH / 2);

    for (let x = 0; x < screenW; x++) {
        const rayAngle = playerAngle - FOV / 2 + (x / screenW) * FOV;

        const ray = castRay(playerX, playerY, rayAngle);
        const correctedDistance = ray.distance * Math.cos(rayAngle - playerAngle);

        zBuffer[x] = correctedDistance;

        const wallHeight = screenH / Math.max(correctedDistance, 0.0001);
        const wallTop = (screenH / 2) - (wallHeight / 2);
        const wallBottom = (screenH / 2) + (wallHeight / 2);

        if (ray.hit === "#") {
            if (correctedDistance < 2) {
                ctx.fillStyle = "#7e7373";
            } else if (correctedDistance < 4) {
                ctx.fillStyle = "#5d5252";
            } else {
                ctx.fillStyle = "#3f3939";
            }
        } else if (ray.hit === "=") {
            ctx.fillStyle = "#8b5a2b";
        } else {
            continue;
        }

        ctx.fillRect(x, wallTop, 1, wallBottom - wallTop);
    }

    renderEnemies();
}

function renderEnemies() {
    const screenW = canvas.width;
    const screenH = canvas.height;

    const sortedEnemies = enemies
        .filter(enemy => enemy.alive)
        .map(enemy => {
            const dx = enemy.x - playerX;
            const dy = enemy.y - playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return { ...enemy, dist };
        })
        .sort((a, b) => b.dist - a.dist);

    for (const enemy of sortedEnemies) {
        const dx = enemy.x - playerX;
        const dy = enemy.y - playerY;

        let angleToEnemy = Math.atan2(dy, dx) - playerAngle;

        while (angleToEnemy < -Math.PI) angleToEnemy += Math.PI * 2;
        while (angleToEnemy > Math.PI) angleToEnemy -= Math.PI * 2;

        if (Math.abs(angleToEnemy) > FOV / 2 + 0.3) continue;

        const dist = enemy.dist * Math.cos(angleToEnemy);
        if (dist <= 0.1) continue;

        const size = canvas.height / dist;
        const screenX = ((angleToEnemy + FOV / 2) / FOV) * screenW;

        const drawX = Math.floor(screenX - size / 2);
        const drawY = Math.floor(screenH / 2 - size / 2);

        for (let x = 0; x < size; x++) {
            const column = drawX + x;
            if (column < 0 || column >= screenW) continue;
            if (dist >= zBuffer[column]) continue;

            if (enemy.health === 3) {
                if (enemySprite) {
                    const srcX = Math.floor((x / size) * enemySprite.width);
                    ctx.drawImage(
                        enemySprite,
                        srcX, 0, 1, enemySprite.height,
                        column, drawY, 1, size
                    );
                } else {
                    ctx.fillStyle = "red";
                    ctx.fillRect(column, drawY, 1, size);
                }
            } else if (enemy.health === 2) {
                if (enemy2Sprite) {
                    const srcX = Math.floor((x / size) * enemy2Sprite.width);
                    ctx.drawImage(
                        enemy2Sprite,
                        srcX, 0, 1, enemy2Sprite.height,
                        column, drawY, 1, size
                    );
                } else {
                    ctx.fillStyle = "red";
                    ctx.fillRect(column, drawY, 1, size);
                }
            } else if (enemy.health === 1) {
                if (enemy3Sprite) {
                    const srcX = Math.floor((x / size) * enemy3Sprite.width);
                    ctx.drawImage(
                        enemy3Sprite,
                        srcX, 0, 1, enemy3Sprite.height,
                        column, drawY, 1, size
                    );
                } else {
                    ctx.fillStyle = "red";
                    ctx.fillRect(column, drawY, 1, size);
                }
            }   
        }
    }
}

function renderWeapon() {
    if (!gunSprite) return;
    if (!aimSprite) return;

    const screenW = canvas.width;
    const screenH = canvas.height;

    let w;
    let h;
    
    if (!aiming) {
        const scale = 15;
        w = gunImage.width * scale;
        h = gunImage.height * scale;
    } else {
        const scale = 30;
        w = aimImage.width * scale;
        h = aimImage.height * scale;
    }    
        
    const bobX = Math.sin(weaponBobTime) * 18 * weaponBobAmount;
    const bobY = Math.abs(Math.cos(weaponBobTime)) * 16 * weaponBobAmount;

    const idleSwayX = Math.sin(performance.now() * 0.002) * 2;
    const idleSwayY = Math.cos(performance.now() * 0.003) * 2;

    const recoilX = -recoil * 0.4;
    const recoilY = recoil;

    const drawX = screenW / 2 - w / 2 + bobX + idleSwayX + recoilX;
    const drawY = screenH - h + bobY + idleSwayY + recoilY;

    if (!aiming) {
        ctx.drawImage(gunSprite, drawX, drawY, w, h);
    } else {
        ctx.drawImage(aimSprite, drawX, drawY-50, w, h);
    }    
}

function renderCrosshair() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
}

function updateEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown--;
        }

        if (dist < 6 && dist > 0.8) {
            const speed = 0.01;

            const nextX = enemy.x + (dx / dist) * speed;
            const nextY = enemy.y + (dy / dist) * speed;

            if (!isBlocked(Math.floor(nextX), Math.floor(enemy.y))) {
                enemy.x = nextX;
            }
            if (!isBlocked(Math.floor(enemy.x), Math.floor(nextY))) {
                enemy.y = nextY;
            }
        }

        if (dist <= 0.8 && enemy.attackCooldown === 0) {
            playerHealth -= 10;
            enemy.attackCooldown = 45;

            if (playerHealth <= 0) {
                playerHealth = 0;
                playerDead = true;
            }
        }
    }

    removeDeadEnemies();

    if (getAliveEnemyCount() === 0) {
        startNextWave();
    }
}

let waveCooldown = 0;

function startNextWave() {
    if (waveCooldown > 0) return;

    wave++;
    enemiesCount += 1;
    spawnEnemies(enemiesCount);
    waveCooldown = 120;
    waveTextTimer = 120;
}

function removeDeadEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i].alive) {
            enemies.splice(i, 1);
        }
    }
}

function renderWaveText() {
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;

    const waveText = `Wave ${wave}`;
    const enemyText = `Enemies: ${getAliveEnemyCount()}/${enemiesCount}`;

    ctx.strokeText(waveText, 20, 50);
    ctx.fillText(waveText, 20, 50);

    ctx.font = "bold 28px Arial";
    ctx.strokeText(enemyText, 20, 90);
    ctx.fillText(enemyText, 20, 90);
}

function renderHealth() {
    const x = 20;
    const y = canvas.height - 40;
    const width = 250;
    const height = 20;

    ctx.fillStyle = "black";
    ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

    ctx.fillStyle = "#550000";
    ctx.fillRect(x, y, width, height);

    const healthWidth = (playerHealth / playerMaxHealth) * width;
    ctx.fillStyle = "#ff2a2a";
    ctx.fillRect(x, y, healthWidth, height);

    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    const text = `Health: ${playerHealth}`;
    ctx.strokeText(text, x, y - 8);
    ctx.fillText(text, x, y - 8);
}

function renderWavePopup() {
    if (waveTextTimer <= 0) return;

    const alpha = Math.min(waveTextTimer / 30, 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.font = "bold 64px Arial";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;
    ctx.textAlign = "center";

    const text = `WAVE ${wave}`;
    const x = canvas.width / 2;
    const y = canvas.height / 3;

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);

    ctx.restore();
    ctx.textAlign = "start";
}

function renderGameOver() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.font = "bold 72px Arial";
    ctx.fillStyle = "red";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;

    ctx.strokeText("GAME OVER", canvas.width / 2, canvas.height / 2);
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);

    ctx.font = "bold 28px Arial";
    ctx.strokeText("Päivä päättyi käytävään", canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText("Päivä päättyi käytävään", canvas.width / 2, canvas.height / 2 + 50);

    ctx.restore();
    ctx.textAlign = "start";
}

function gameLoop() {
    update();

    if (!playerDead) {
        updateEnemies();
    }

    render();
    renderWeapon();
    renderCrosshair();
    renderWaveText();
    renderWavePopup();
    renderHealth();

    if (playerDead) {
        renderGameOver();
    }

    requestAnimationFrame(gameLoop);
}

startNextWave();
gameLoop();
