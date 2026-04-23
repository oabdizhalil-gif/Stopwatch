document.body.style.backgroundColor = "#37353E";
document.body.style.color = "#E0E0E0";

const display = document.getElementById("display");
let startTime = 0;
let timer = null;
let elapsedTime = 0;
let running = false;




function runTime() {
    const currentTime = Date.now();
    elapsedTime = currentTime - startTime;

    const miliseconds = Math.floor(elapsedTime % 1000 / 10).toString().padStart(2, "0");
    const seconds = Math.floor(elapsedTime / 1000 % 60).toString().padStart(2, "0");
    const minutes = Math.floor(elapsedTime / (1000 * 60) % 60).toString().padStart(2, "0");
    const hours = Math.floor(elapsedTime / (1000 * 60 * 60) % 24).toString().padStart(2, "0");

    display.textContent = `${hours}:${minutes}:${seconds}:${miliseconds}`;

    console.log(elapsedTime);
}
const btn = document.getElementById("startBtn");
function startFn() {
    if(!running) {
        running = true;        
        startTime = Date.now() - elapsedTime;
        timer = setInterval(runTime, 10);
    
    } 
}

function stopFn() {
    if(running) {
        clearInterval(timer);
        elapsedTime = Date.now() - startTime;
        running = false;
    }
}

function resetFn() {
    
    clearInterval(timer);
    startTime = 0;
    elapsedTime = 0;
    running = false;

    display.textContent = "00:00:00:00";
}