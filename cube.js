"use strict";

import { RenderItem, Renderer } from "./renderer.js";
import { mat4 } from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';

const cubeVertices = new Float32Array([
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

export class Cube extends RenderItem {
    constructor(renderer) {
        super(renderer, "cube");

        this.sampler = this.device.createSampler({
            addressModeU: "repeat",  // Default is "clamp-to-edge".
            addressModeV: "repeat",  //    (The other possible value is "mirror-repeat".)
            minFilter: "linear",
            magFilter: "linear",     // Default for filters is "nearest".
            mipmapFilter: "linear",
            maxAnisotropy: 16        // 1 is the default; 16 is the maximum.
        });
        this.shader = null;
        this.pipeline = null;
        this.uniformBindGroup = null;
        this.textureBindGroup = null;
        this.vertexBuffer = null;
        this.vertexBufferLayout = null;
        this.texture = null;
        this.modelMatrix = mat4.identity();
        this.modelMatrix = mat4.translate(this.modelMatrix, [1, 1, -3]);
        this.modelUniformBuffer = null;
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
                topology: "triangle-list",
                cullMode: "back",
                frontFace: "ccw"
            },
            layout: "auto",
            
            multisample: {  // Sets number of samples for multisampling.
                count: 4,     //  (1 and 4 are currently the only possible values).
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        };
        this.pipeline = this.device.createRenderPipeline(pipelineDescriptor);
    }
    
    createBindGroups() {
        this.uniformBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.modelUniformBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: this.renderer.viewProjectionUniformBuffer }
                }
            ]
        });
        this.textureBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [ // An array of resource specifications.
                {
                    binding: 0,
                    resource: this.texture.createView()
                },
                {
                    binding: 1,
                    resource: this.sampler
                }
            ]
        });
    }

    async setFaceTexture(URL) {
        this.texture = await this.renderer.createTexture(URL);
    }
    
    createBuffers() {
        this.vertexBuffer = this.device.createBuffer({
            size: cubeVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.modelUniformBuffer = this.device.createBuffer({
            size: 4 * 4 * 4, // 4x4 matrix of 4-byte floats
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    loadBuffers() {
        this.device.queue.writeBuffer(this.vertexBuffer, 0, cubeVertices);
    }

    updateModelUniformBuffer() {
        this.device.queue.writeBuffer(this.modelUniformBuffer, 0, this.modelMatrix);
    }

    async init() {
        this.shader = await this.renderer.createShader("shader");
        this.createPipeline();
        this.createBuffers();
        await this.setFaceTexture("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/960px-FullMoon2010.jpg");
        this.createBindGroups();
        this.loadBuffers();
        this.updateModelUniformBuffer();
    }

    onRender(commandEncoder) {
        let renderPassDescriptor = {
            colorAttachments: [{
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
                loadOp: "clear", // Alternative is "load".
                storeOp: "store",  // Alternative is "discard".
                view: this.renderer.textureViewForMultisampling, // Render to multisampling texture.
                resolveTarget: this.context.getCurrentTexture().createView() // Final image.
            }],
            depthStencilAttachment: {  // Add depth buffer to the colorAttachment
                view: this.renderer.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
                resolveTarget: this.context.getCurrentTexture().createView() // Final image.
            },
        };
        let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);            // Specify pipeline.
        passEncoder.setVertexBuffer(0, this.vertexBuffer);  // Attach vertex buffer.
        passEncoder.setBindGroup(0, this.uniformBindGroup); // Attach bind group.
        passEncoder.setBindGroup(1, this.textureBindGroup); // Attach bind group.
        passEncoder.draw(36);
        passEncoder.end();
    }
}
