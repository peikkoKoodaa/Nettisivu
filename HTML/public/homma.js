const alusta = document.getElementById('piirto');
const d = alusta.getContext('2d');

var x = 100;
var y = 310;

var vX = 500;
var vY = 310;

const movespeed = 3;

const keys = {};

const maankorkeus = 575;

var painovoima = 0.25;

var nopeus_y = 0;
var Vnopeus_y = 0;
var maassa = true;
var Vmaassa = true;

let viimeisinAika = performance.now();
let fps = 0;

function draw() {
    d.clearRect(0, 0, alusta.width, alusta.height);

    d.fillStyle = 'rgba(8, 232, 240, 1)';
    d.fillRect(0, 0, alusta.width, alusta.height);

    d.fillStyle = 'rgba(241, 245, 26, 1)';
    d.beginPath();
    d.arc(50, 50, 50, 0, Math.PI * 2);
    d.fill();
    d.stroke();

    //Maa
    d.fillStyle = 'rgb(0, 255, 0)';
    d.fillRect(0, 625, 800, 75);

    //Pelaaja
    d.fillStyle = 'blue';
    d.fillRect(x, y, 50, 50);

    //Vihollinen
    d.fillStyle = 'rgb(255, 0, 0)';
    d.fillRect(vX, vY, 50, 50)
}

document.addEventListener('keydown', function(event) {
    keys[event.key] = true;
});

document.addEventListener('keyup', function(event) {
    keys[event.key] = false;
});

function update() {
    const nyt = performance.now();
    const delta = nyt - viimeisinAika;
    fps = 1000 / delta;
    viimeisinAika = nyt;

    if (keys['ArrowLeft']) {
        x -= movespeed;
    }

    if (x < vX) {
        vX -= 1;
    }

    if (keys['ArrowRight']) {
        x += movespeed;
    }

    if (x > vX) {
        vX += 1;
    }

    if (keys['ArrowUp'] && maassa) {
        nopeus_y = -8;
        maassa = false;
    }

    if (x == vX && Vmaassa && y == vY) {
        Vnopeus_y = -8;
        Vmaassa = false;
    }

    nopeus_y += painovoima;
    y += nopeus_y;
    Vnopeus_y += painovoima;
    vY += Vnopeus_y;

    if (y >= maankorkeus) {
        y = maankorkeus;
        nopeus_y = 0;
        maassa = true;
    }
    if (vY >= maankorkeus) {
        vY = maankorkeus;
        Vnopeus_y = 0;
        Vmaassa = true;
    }

    if (x < 0) {
        x = 0
    }
    if (x > 800) {
        x = 800
    }    

    draw();
    d.fillStyle = 'black';
    d.font = '20px Arial';
    d.fillText(`FPS: ${fps.toFixed(1)}`, 10, 30);
    requestAnimationFrame(update);
}
update();
