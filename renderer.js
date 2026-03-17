"use strict";

import {
    vec3,
    mat4,
} from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';

async function loadShader(elementID) {
    return 
}

export class Renderer {
    constructor(canvas) {
        console.log("Canvas width: " + canvas.width + ", height: " + canvas.height);
        this.canvas = canvas;
        this.context = canvas.getContext("webgpu");
        this.adapter = null;
        this.device = null;
        this.renderItems = [];
        
        this.fov = 45 * Math.PI / 180;
        this.cameraUp = vec3.fromValues(0, 1, 0);
        this.camaraPosition = vec3.fromValues(0, 0, 3);
        this.cameraFront = vec3.fromValues(0, 0, -1);
        this.viewProjectionUniformBuffer = null;
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
        this.viewProjectionUniformBuffer = this.device.createBuffer({
            size: 4 * 4 * 4, // currently only view projection matrix.
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        this.updateViewProjectionUniformBuffer();
    }

    addRenderItem(item) {
        this.renderItems.push(item);
    }

    setCameraFront(front) {
        this.cameraFront = front;
        this.updateViewProjectionUniformBuffer();
    }

    setCameraPosition(position) {
        this.camaraPosition = position;
        this.updateViewProjectionUniformBuffer();
    }

    updateViewProjectionUniformBuffer() {
        let projectionMatrix = mat4.perspective(this.fov, this.canvas.width / this.canvas.height, 0.1, 100);
        let viewMatrix = mat4.lookAt(this.camaraPosition, vec3.add(this.camaraPosition, this.cameraFront), this.cameraUp);
        let viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);
        this.device.queue.writeBuffer(this.viewProjectionUniformBuffer, 0, viewProjectionMatrix);
    }

    async createShader(elementID) {
        let code = await fetch(document.getElementById(elementID).src).then(r => r.text());
        if (!this.device) {
            throw Error("WebGPU device not initialized.");
        }
        return this.device.createShaderModule({
            code: code
        });
    }

    async createTexture(URL) {
        // Standard method using the fetch API to get a texture from a ULR.
        let response = await fetch(URL);
        let blob = await response.blob();  // Get image data as a "blob".
        let imageBitmap = await createImageBitmap(blob);
        let texture = this.device.createTexture({
            size: [imageBitmap.width, imageBitmap.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT
        });
        this.device.queue.copyExternalImageToTexture(
            { source: imageBitmap, flipY: true },
            { texture: texture },
            [imageBitmap.width, imageBitmap.height]
        );
        return texture;
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

        for (const item of this.renderItems) {
            console.log("Rendering item " + item.name);
            let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            item.onRender(passEncoder);
            passEncoder.end();
        }

        this.device.queue.submit([commandEncoder.finish()]);
    }
}

export class RenderItem {
    constructor(renderer, name) {
        this.renderer = renderer;
        this.device = renderer.device;
        this.name = name;
        renderer.addRenderItem(this);
    }

    onRender(passEncoder) {}
}
