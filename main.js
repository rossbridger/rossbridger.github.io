"use strict";

import { installMouseHandler, Renderer } from "./renderer.js";

let canvas;

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

    let renderer = new Renderer(canvas);
    await renderer.init();
    await renderer.createShaders();
    renderer.createPipeline();
    renderer.createBuffers();
    renderer.createBindGroups();
    renderer.loadVertexAndIndexBuffers();
    renderer.updateStorageBuffers();

    function draw() {
        renderer.updateUniformBuffers();
        renderer.draw();
        requestAnimationFrame(draw);
    }
    draw();
}

window.onload = init; // arranges for function init to be called when page is loaded
