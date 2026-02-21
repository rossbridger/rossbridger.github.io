"use strict";

import { Renderer } from "./renderer.js";

let canvas;
let dragging = false;  // set to true when a drag action is in progress.
let startX, startY;    // coordinates of mouse at start of drag.
let prevX, prevY;      // previous mouse position during a drag.

const vertexData = new Float32Array([
    /* coords */     /* color */
    -0.8, -0.6, 1, 0, 0,      // data for first vertex
    0.8, -0.6, 0, 1, 0,      // data for second vertex
    0.0, 0.7, 0, 0, 1       // data for third vertex
]);

const indexData = new Uint32Array([
    0, 1, 2
]);

async function getTextContent(elementID) {
    return fetch(document.getElementById(elementID).src).then(r => r.text());
}

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


async function render() {
    let renderer = new Renderer(canvas);
    await renderer.init();
    let shaderModule = renderer.createShader(await getTextContent("shader"));
    
    let vertexBufferLayout = [
        {   // One vertex buffer, containing values for two attributes.
            attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x2" },
                { shaderLocation: 1, offset: 8, format: "float32x3" }
            ],
            arrayStride: 20,
            stepMode: "vertex"
        }
    ];

    let uniformBindGroupLayout = renderer.createBindGroupLayout({
        entries: [ // An array of resource specifications.
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            }
        ]
    });

    let pipelineDescriptor = {
        vertex: { // Configuration for the vertex shader.
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: vertexBufferLayout
        },
        fragment: { // Configuration for the fragment shader.
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        primitive: {
            topology: "triangle-list"
        },
        layout: renderer.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        }),
        multisample: {  // Sets number of samples for multisampling.
            count: 4,     //  (1 and 4 are currently the only possible values).
        },
    };
    let pipeline = renderer.createPipeline(pipelineDescriptor);

    let pipelineDescriptorForOutline = {
        vertex: { // Configuration for the vertex shader.
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: vertexBufferLayout
        },
        fragment: { // Configuration for the fragment shader.
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        primitive: {
            topology: "line-strip"
        },
        layout: renderer.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        }),
        multisample: {  // Sets number of samples for multisampling.
            count: 4,     //  (1 and 4 are currently the only possible values).
        },
    };
    let pipelineForOutline = renderer.createPipeline(pipelineDescriptorForOutline);

    let vertexBuffer = renderer.createBuffer(vertexData.byteLength, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
    let indexBuffer = renderer.createBuffer(indexData.byteLength, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
    let uniformBuffer = renderer.createBuffer(3 * 4, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    let uniformBindGroup = renderer.createBindGroup(uniformBindGroupLayout, [
        {
            binding: 0,
            resource: { buffer: uniformBuffer }
        }
    ]);

    renderer.writeBuffer(vertexBuffer, vertexData);
    renderer.writeBuffer(indexBuffer, indexData);
    let textureForMultisampling = renderer.createTexture(
        [renderer.canvas.width, renderer.canvas.height],
        navigator.gpu.getPreferredCanvasFormat(),
        4,
        GPUTextureUsage.RENDER_ATTACHMENT
    );
    let textureViewForMultisampling = textureForMultisampling.createView();

    // drawing
    let renderPassDescriptor = {
        colorAttachments: [{
            clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
            loadOp: "clear", // Alternative is "load".
            storeOp: "store",  // Alternative is "discard".
            view: textureViewForMultisampling, // Render to multisampling texture.
            resolveTarget: renderer.getCurrentTexture().createView() // Resolve to the canvas.
        }]
    };
    
    renderPassDescriptor.colorAttachments[0].loadOp = "clear";
    renderer.drawIndexed(3, renderPassDescriptor, pipeline, indexBuffer, [vertexBuffer, vertexBuffer], [uniformBindGroup]);
    
    renderPassDescriptor.colorAttachments[0].loadOp = "load";
    renderer.draw(3, renderPassDescriptor, pipelineForOutline, [vertexBuffer, vertexBuffer], [uniformBindGroup]);
    renderer.render();
}

function init() {
    try {
        canvas = document.getElementById("canvas");
    } catch (e) {
        document.getElementById("canvasholder").innerHTML =
            "<p>Canvas graphics is not supported.<br>" +
            "An error occurred while initializing graphics.</p>";
        return;
    }
    document.addEventListener("mousedown", doMouseDown);
    render();
}

window.onload = init; // arranges for function init to be called when page is loaded
