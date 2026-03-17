"use strict";

import { Renderer } from "./renderer.js";
import { vec3 } from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';
import { Cube } from "./cube.js";

let canvas;
let renderer;

let offsetX = -90;
let offsetY = 0;

export function installMouseHandler() {

    let dragging = false;  // set to true when a drag action is in progress.
    let startX, startY;    // coordinates of mouse at start of drag.
    let prevX, prevY;      // previous mouse position during a drag.

    function doMouseDown(evt) {
        // This function is called when the user presses a button on the mouse.
        // Only the main mouse button will start a drag.
        if (dragging) {
            return;  // if a drag is in progress, don't start another.
        }
        if (evt.button != 0) {
            return;  // don't respond unless the button is the main (left) mouse button.
        }
        const r = canvas.getBoundingClientRect();
        const x = Math.round(evt.clientX - r.left);  // translate mouse position from screen coords to canvas coords.
        const y = Math.round(evt.clientY - r.top);   // round to integer values; some browsers would give non-integers.
        dragging = true;  // (this won't be the case for all mousedowns in all programs)
        if (dragging) {
            startX = prevX = x;
            startY = prevY = y;
            document.addEventListener("mousemove", doMouseMove, false);
            document.addEventListener("mouseup", doMouseUp, false);
        }
    }

    function doMouseMove(evt) {
        // This function is called when the user moves the mouse during a drag.
        if (!dragging) {
            return;  // (shouldn't be possible)
        }
        const r = canvas.getBoundingClientRect();
        const x = Math.round(evt.clientX - r.left);   // (x,y) mouse position in canvas coordinates
        const y = Math.round(evt.clientY - r.top);

        let dx = (x - prevX);
        let dy = (y - prevY);

        const sensitivity = 0.1;
        dx *= sensitivity;
        dy *= sensitivity;

        offsetX -= dx;
        offsetY += dy;

        if (offsetY > 89.0)
            offsetY = 89.0;
        if (offsetY < -89.0)
            offsetY = -89.0;

        let yaw = offsetX * Math.PI / 180.0;
        let pitch = offsetY * Math.PI / 180.0;

        let direction = vec3.fromValues(
            Math.cos(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            Math.sin(yaw) * Math.cos(pitch)
        );

        let cameraFront = vec3.normalize(direction);
        if (renderer) {
            renderer.setCameraFront(cameraFront);
        }
        prevX = x;  // update prevX,prevY to prepare for next call to doMouseMove
        prevY = y;
    }

    function doMouseUp(evt) {
        // This function is called when the user releases a mouse button during a drag.
        if (!dragging) {
            return;  // (shouldn't be possible)
        }
        dragging = false;
        document.removeEventListener("mousemove", doMouseMove, false);
        document.removeEventListener("mouseup", doMouseMove, false);
    }

    canvas.addEventListener("mousedown", doMouseDown, false);
}


async function init() {
    try {
        canvas = document.getElementById("canvas");
    } catch (e) {
        document.getElementById("canvasholder").innerHTML =
            "<p>Canvas graphics is not supported.<br>" +
            "An error occurred while initializing graphics.</p>";
        return;
    }

    const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
            const width = entry.contentBoxSize[0].inlineSize;
            const height = entry.contentBoxSize[0].blockSize;
            const canvas = entry.target;
            canvas.width = Math.max(1, Math.floor(width));
            canvas.height = Math.max(1, Math.floor(height));
        }
    });
    observer.observe(canvas);
    installMouseHandler();

    renderer = new Renderer(canvas);
    await renderer.init();
    let cube = new Cube(renderer);
    await cube.init();
    
    function draw() {
        renderer.draw();
        requestAnimationFrame(draw);
    }
    draw();
}

window.onload = init; // arranges for function init to be called when page is loaded
