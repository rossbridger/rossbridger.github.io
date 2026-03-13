"use strict";

import { Renderer } from "./renderer.js";
import {
  vec3,
  mat4,
} from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';

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

    let renderer = new Renderer(canvas);
    await renderer.init();
    await renderer.createShaders();
    renderer.createPipeline();
    renderer.createBuffers();
    renderer.createBindGroups();
    renderer.loadVertexAndIndexBuffers();

    function draw() {
        renderer.updateUniformBuffers();
        renderer.draw();
        requestAnimationFrame(draw);
    }
    draw();
}

window.onload = init; // arranges for function init to be called when page is loaded
