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
            sampleCount: 4,
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.textureForMultisampling = this.device.createTexture({
            size: [this.context.canvas.width, this.context.canvas.height],
            sampleCount: 4,  // (1 and 4 are currently the only possible values.)
            format: navigator.gpu.getPreferredCanvasFormat(),
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.textureViewForMultisampling = this.textureForMultisampling.createView();

        this.viewProjectionUniformBuffer = this.device.createBuffer({
            size: 4 * 4 * 4, // currently only view projection matrix.
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        this.updateViewProjectionUniformBuffer();

        console.log("WebGPU initialized.")
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

    async createCubemapTexture(URLs) {
        let texture;
        for (let i = 0; i < 6; i++) {
            let response = await fetch(URLs[i]); // Get image number i.
            let blob = await response.blob();
            let imageBitmap = await createImageBitmap(blob);
            if (i == 0) { // (We need to know the image size to create the texture.)
                texture = device.createTexture({
                    size: [imageBitmap.width, imageBitmap.height, 6],
                    // (The 6 at the end means that there are 6 images.)
                    dimension: "2d",  // (This is the default texture dimension.)
                    format: 'rgba8unorm',
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST |
                        GPUTextureUsage.RENDER_ATTACHMENT
                });
            }
            device.queue.copyExternalImageToTexture(
                { source: imageBitmap },
                { texture: texture, origin: [0, 0, i] },
                // The i at the end puts the image into side number i of the cube.
                [imageBitmap.width, imageBitmap.height]
            );
        }
        return texture;
    }

    draw() {
        let commandEncoder = this.device.createCommandEncoder();

        for (const item of this.renderItems) {
            item.onRender(commandEncoder);
        }

        this.device.queue.submit([commandEncoder.finish()]);
    }
}

export class RenderItem {
    constructor(renderer, name) {
        this.renderer = renderer;
        this.device = renderer.device;
        this.context = renderer.context;
        this.name = name;
        renderer.addRenderItem(this);
    }

    onRender(commandEncoder) { }
}
