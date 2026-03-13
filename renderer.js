"use strict";

import {
    vec3,
    mat4,
} from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';

async function loadShader(elementID) {
    return fetch(document.getElementById(elementID).src).then(r => r.text());
}

const fov = 45 * Math.PI / 180;

let cubeVertices = new Float32Array([
    -0.5, -0.5, -0.5, 0.0, 0.0,
    0.5, -0.5, -0.5, 1.0, 0.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    -0.5, 0.5, -0.5, 0.0, 1.0,
    -0.5, -0.5, -0.5, 0.0, 0.0,

    -0.5, -0.5, 0.5, 0.0, 0.0,
    0.5, -0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 1.0,
    0.5, 0.5, 0.5, 1.0, 1.0,
    -0.5, 0.5, 0.5, 0.0, 1.0,
    -0.5, -0.5, 0.5, 0.0, 0.0,

    -0.5, 0.5, 0.5, 1.0, 0.0,
    -0.5, 0.5, -0.5, 1.0, 1.0,
    -0.5, -0.5, -0.5, 0.0, 1.0,
    -0.5, -0.5, -0.5, 0.0, 1.0,
    -0.5, -0.5, 0.5, 0.0, 0.0,
    -0.5, 0.5, 0.5, 1.0, 0.0,

    0.5, 0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, -0.5, -0.5, 0.0, 1.0,
    0.5, -0.5, -0.5, 0.0, 1.0,
    0.5, -0.5, 0.5, 0.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 0.0,

    -0.5, -0.5, -0.5, 0.0, 1.0,
    0.5, -0.5, -0.5, 1.0, 1.0,
    0.5, -0.5, 0.5, 1.0, 0.0,
    0.5, -0.5, 0.5, 1.0, 0.0,
    -0.5, -0.5, 0.5, 0.0, 0.0,
    -0.5, -0.5, -0.5, 0.0, 1.0,

    -0.5, 0.5, -0.5, 0.0, 1.0,
    0.5, 0.5, -0.5, 1.0, 1.0,
    0.5, 0.5, 0.5, 1.0, 0.0,
    0.5, 0.5, 0.5, 1.0, 0.0,
    -0.5, 0.5, 0.5, 0.0, 0.0,
    -0.5, 0.5, -0.5, 0.0, 1.0
]);

let cameraUp = vec3.fromValues(0, 1, 0);
let camaraPosition = vec3.fromValues(0, 0, 3);
let cameraFront = vec3.fromValues(0, 0, -1);
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

        cameraFront = vec3.normalize(direction);

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

export class Renderer {
    constructor(canvas) {
        console.log("Canvas width: " + canvas.width + ", height: " + canvas.height);
        this.canvas = canvas;
        this.context = canvas.getContext("webgpu");
        this.adapter = null;
        this.device = null;

        // install event handlers

    }
    async init(format = null, alphaMode = "premultiplied") {
        if (!navigator.gpu) {
            throw Error("WebGPU not supported in this browser.");
        }
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw Error("WebGPU is supported, but couldn't get WebGPU adapter.");
        }

        this.device = await this.adapter.requestDevice();
        this.context.configure({
            device: this.device,
            format: format || navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: alphaMode
        });
        this.depthTexture = this.device.createTexture({
            size: [this.context.canvas.width, this.context.canvas.height],  // size of canvas
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        console.log("WebGPU initialized.")
    }

    async createShaders() {
        let code = await loadShader("shader");
        if (!this.device) {
            throw Error("WebGPU device not initialized.");
        }
        this.shader = this.device.createShaderModule({
            code: code
        });
    }

    createPipeline() {
        this.vertexBufferLayout = [ // An array of vertex buffer specifications.
            {
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x3" }, // vertex position
                    { shaderLocation: 1, offset: 12, format: "float32x2" } // uv
                ],
                arrayStride: 20,
                stepMode: "vertex"
            }
        ];

        this.uniformBindGroupLayout = this.device.createBindGroupLayout({
            entries: [ // An array of resource specifications.
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"
                    }
                }
                /*{
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "read-only-storage"
                    }
                }*/
            ]
        });

        let pipelineDescriptor = {
            vertex: { // Configuration for the vertex shader.
                module: this.shader,
                entryPoint: "vertexMain",
                buffers: this.vertexBufferLayout
            },
            fragment: { // Configuration for the fragment shader.
                module: this.shader,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: {
                topology: "triangle-list"
            },
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [this.uniformBindGroupLayout]
            }),
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        };
        this.pipeline = this.device.createRenderPipeline(pipelineDescriptor);
    }

    createBuffers() {
        this.vertexBuffer = this.device.createBuffer({
            size: cubeVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        /*this.instanceBuffer = this.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });*/
        this.uniformBuffer = this.device.createBuffer({
            size: 4 * 4 * 4 * 2, // modelview and projection matrix both 4x4 floats
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        /*this.storageBuffer = this.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.indexBuffer = this.device.createBuffer({
            size: cubeIndices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });*/
    }

    createBindGroups() {
        this.uniformBindGroup = this.device.createBindGroup({
            layout: this.uniformBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }
                /*{
                    binding: 1, // Corresponds to the binding 0 in the layout.
                    resource: { buffer: this.storageBuffer }
                }*/
            ]
        });
    }

    loadVertexAndIndexBuffers() {
        this.device.queue.writeBuffer(this.vertexBuffer, 0, cubeVertices);
        //this.device.queue.writeBuffer(this.indexBuffer, 0, cubeIndices);
    }

    updateUniformBuffers() {
        let projectionMatrix = mat4.perspective(fov, this.canvas.width / this.canvas.height, 0.1, 100);
        let modelViewMatrix = mat4.lookAt(camaraPosition, vec3.add(camaraPosition, cameraFront), cameraUp);
        this.device.queue.writeBuffer(this.uniformBuffer, 0, modelViewMatrix);
        this.device.queue.writeBuffer(this.uniformBuffer, modelViewMatrix.byteLength, projectionMatrix);
    }

    updateStorageBuffers() {
        //this.device.queue.writeBuffer(this.storageBuffer, 0, instanceData);
    }

    draw() {
        let commandEncoder = this.device.createCommandEncoder();
        let renderPassDescriptor = {
            colorAttachments: [{
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
                loadOp: "clear", // Alternative is "load".
                storeOp: "store",  // Alternative is "discard".
                view: this.context.getCurrentTexture().createView()  // Draw to the canvas.
            }],
            depthStencilAttachment: {  // Add depth buffer to the colorAttachment
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            }
        };

        let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);            // Specify pipeline.
        passEncoder.setVertexBuffer(0, this.vertexBuffer);  // Attach vertex buffer.
        //passEncoder.setIndexBuffer(this.indexBuffer, "uint16"); // Attach index buffer.
        passEncoder.setBindGroup(0, this.uniformBindGroup); // Attach bind group.
        passEncoder.draw(36);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}
