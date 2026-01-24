import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x009cff);
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader  = new THREE.TextureLoader();

const grassTexture = loader.load('ruoho.png');
const playerTexture = loader.load('pelaaja.png');
const dirtTexture = loader.load('multa.png');
const stoneTexture = loader.load('kivi.png');
const woodTexture = loader.load('puu.png');

const tpsControls = new OrbitControls(camera, renderer.domElement);
const fpsControls = new PointerLockControls(camera, document.body);
scene.add(fpsControls.getObject());

tpsControls.enableDamping = true;
tpsControls.dampingFactor = 0.05;
tpsControls.screenSpacePanning = false;
tpsControls.minDistance = 3;
tpsControls.maxDistance = 7;
tpsControls.maxPolarAngle = Math.PI / 2;

const moveSpeed = 0.1;
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
let velocityY = 0;
const gravity = -0.02;
const jumpStrength = 0.35;
let onGround = false;
let cameraMode = 'TPS';
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const groundObjects = [];
const playerHeight = 1;
const groundTolerance = 0.49;
let jumping = false;
const playerRadius = 0.3;
const sideRayLength = 0.35;
const breakRay = new THREE.Raycaster();
const FPSBreakDistance = 5;
const TPSBreakDistance = 10;
const lookRay = new THREE.Raycaster();
const lookDir = new THREE.Vector3();
const lookOrigin = new THREE.Vector3();
const MAX_FPS = 60;
const FRAME_TIME = 1000 / MAX_FPS;
let lastFrameTime = 0;
const mouse = new THREE.Vector2();
const crosshair = document.getElementById('crosshair');
const playerHalf = new THREE.Vector3(0.3, 0.5, 0.3);

function cube(texture, x=0, y=0, z=0) { 
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(), 
        new THREE.MeshStandardMaterial({ 
            map: texture
        })
    );
    mesh.position.set(x, y, z);
    return mesh;
}

function platform(texture, x, y, z, width, height, depth) {
    for (let ly=y;ly<y+height;ly++) {
        for (let lz=z;lz<z+depth;lz++) {
            for (let lx=x;lx<x+width;lx++) {
                const box = cube(texture, lx, ly, lz);
                scene.add(box);
                groundObjects.push(box);
            }
        }
    }
}

const depth = 5;
const width = 5;

const light = new THREE.AmbientLight(0xffffff, 2)
light.position.set(5, 10, 5);
scene.add(light);

const player = cube(playerTexture,0,playerHeight,0);
scene.add(player);
player.userData.isPlayer = true;

platform(grassTexture, -5, -2, -5, 10, 1, 10);
platform(dirtTexture, -5, -6, -5, 10, 4, 10);
platform(stoneTexture, -5, -10, -5, 10, 5, 10);

function toggleCameraMode() {
    if (cameraMode === 'TPS') {
        cameraMode = 'FPS';

        tpsControls.enabled = false;

        camera.position.copy(player.position).add(new THREE.Vector3(0, 1.6, 0));
        fpsControls.getObject().position.copy(player.position);

    } else {
        cameraMode = 'TPS';

        fpsControls.unlock();
        tpsControls.enabled = true;

        camera.position.set(
            player.position.x,
            player.position.y + 4,
            player.position.z + 6
        );
        tpsControls.target.copy(player.position);
        tpsControls.enableDamping = true;
        tpsControls.dampingFactor = 0.05;
        tpsControls.screenSpacePanning = false;
        tpsControls.minDistance = 3;
        tpsControls.maxDistance = 7;
        tpsControls.maxPolarAngle = Math.PI / 2;
    }
    player.visible = cameraMode === 'TPS';
    if (cameraMode === 'FPS') {
        crosshair.style.left = '50%';
        crosshair.style.top = '50%';
    }
}

camera.position.set(width/2, 10, depth + 10);
camera.lookAt(width/2, 0, depth/2);

const keysPressed = {};

window.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
});

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'v') {
        toggleCameraMode();
    }
});

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (cameraMode === 'TPS') {
        crosshair.style.left = event.clientX + 'px';
        crosshair.style.top = event.clientY + 'px';
    }
});

function checkGround() {
    const offsets = [
        [-0.4, -0.4],
        [-0.4,  0.4],
        [ 0.4, -0.4],
        [ 0.4,  0.4]
    ];

    raycaster.far = 1.1;

    for (let [ox, oz] of offsets) {
        const origin = new THREE.Vector3(
            player.position.x + ox,
            player.position.y + 0.5,
            player.position.z + oz
        );

        raycaster.set(origin, down);
        const hits = raycaster.intersectObjects(groundObjects, false);

        if (hits.length > 0) {
            return hits[0].point.y;
        }
    }
    return null;
}

function checkCollisions(playerPosition, velocityY) {
    let newPos = playerPosition.clone();
    let newVelY = velocityY;
    let onGround = false;

    const playerBox = new THREE.Box3().setFromCenterAndSize(
        newPos.clone().add(new THREE.Vector3(0, playerHeight/2, 0)),
        new THREE.Vector3(playerRadius*2, playerHeight, playerRadius*2)
    );

    for (let obj of groundObjects) {
        const objBox = new THREE.Box3().setFromObject(obj);

        if (playerBox.intersectsBox(objBox)) {
            if (newPos.y + playerHeight/2 > objBox.max.y && velocityY > 0) {
                newPos.y = objBox.min.y - playerHeight/2;
                newVelY = 0;
            }
            else if (newPos.y - playerHeight/2 < objBox.max.y && velocityY <= 0) {
                newPos.y = objBox.max.y + playerHeight/2;
                newVelY = 0;
                onGround = true;
            }
            if (playerBox.max.x > objBox.min.x && playerBox.min.x < objBox.max.x) {
                if (newPos.x < objBox.min.x) newPos.x = objBox.min.x - playerRadius;
                else if (newPos.x > objBox.max.x) newPos.x = objBox.max.x + playerRadius;
            }
            if (playerBox.max.z > objBox.min.z && playerBox.min.z < objBox.max.z) {
                if (newPos.z < objBox.min.z) newPos.z = objBox.min.z - playerRadius;
                else if (newPos.z > objBox.max.z) newPos.z = objBox.max.z + playerRadius;
            }
        }
    }

    return { position: newPos, velocityY: newVelY, onGround: onGround };
}

window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('mousedown', (e) => {
    if (cameraMode === 'FPS') {
        breakRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    } else {
        breakRay.setFromCamera(mouse, camera);
    }

    breakRay.near = 0.2;
    breakRay.far = cameraMode === 'FPS' ? FPSBreakDistance : TPSBreakDistance;

    const intersects = breakRay.intersectObjects(groundObjects, false);
    if (intersects.length === 0) return;

    const hit = intersects[0];
    
    if (e.button === 0) {
        scene.remove(hit.object);
        groundObjects.splice(groundObjects.indexOf(hit.object), 1);
    } 
    else if (e.button === 2) {
        const normal = hit.face.normal.clone();
        const position = hit.object.position.clone().add(normal);
        const newBlock = cube(woodTexture, position.x, position.y, position.z);
        scene.add(newBlock);
        groundObjects.push(newBlock);
    }
});

function canMove(direction) {
    const origins = [
        new THREE.Vector3(player.position.x - playerRadius, player.position.y, player.position.z),
        new THREE.Vector3(player.position.x + playerRadius, player.position.y, player.position.z),
        new THREE.Vector3(player.position.x, player.position.y, player.position.z - playerRadius),
        new THREE.Vector3(player.position.x, player.position.y, player.position.z + playerRadius),
    ];

    for (let origin of origins) {
        raycaster.set(origin, direction);
        const hits = raycaster.intersectObjects(groundObjects, false);
        if (hits.length > 0 && hits[0].distance < sideRayLength) {
            return false;
        }
    }
    return true;
}

function main(time) {
    requestAnimationFrame(main);

    if (time - lastFrameTime < FRAME_TIME) return;
    lastFrameTime = time;

    forward.set(0, 0, 0);
    right.set(0, 0, 0);
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    if (keysPressed['w'] && canMove(forward)) {
        player.position.addScaledVector(forward, moveSpeed);
    }
    if (keysPressed['s'] && canMove(forward.clone().negate())) {
        player.position.addScaledVector(forward, -moveSpeed);
    }
    if (keysPressed['a'] && canMove(right.clone().negate())) {
        player.position.addScaledVector(right, -moveSpeed);
    }
    if (keysPressed['d'] && canMove(right)) {
        player.position.addScaledVector(right, moveSpeed);
    }

    if (keysPressed[' '] && onGround && !jumping) {
        velocityY = jumpStrength;
        jumping = true;
        onGround = false;
    }

    velocityY += gravity;
    player.position.y += velocityY;

    const collision = checkCollisions(player.position, velocityY);
    player.position.copy(collision.position);
    velocityY = collision.velocityY;
    onGround = collision.onGround;

    const groundY = checkGround();
    if (groundY !== null) {
        onGround = true;
        jumping = false;
        velocityY = 0;
        player.position.y = groundY + playerHeight / 2;
    } else {
        onGround = false;
    }

    if (player.position.y <= -30) {
        player.position.set(0, 5, 0);
        velocityY = 0;
    }

    if (cameraMode === 'FPS') {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        fpsControls.lock();
        fpsControls.getObject().position.copy(player.position);
        fpsControls.getObject().position.y += 1.6;
    } else {
        raycaster.setFromCamera(mouse, camera);
        tpsControls.target.lerp(player.position, 0.2);
        tpsControls.update();
    }

    renderer.render(scene, camera);
}

main();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});